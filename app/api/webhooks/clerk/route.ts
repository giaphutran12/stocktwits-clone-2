// Clerk Webhook Route - Syncs Clerk users to our database
//
// HOW THIS WORKS:
// When someone signs up, updates their profile, or deletes their account in Clerk,
// Clerk sends a "webhook" (an HTTP request) to this endpoint with the user data.
// We then create/update/delete the corresponding user in our PostgreSQL database.
//
// WHY WE NEED THIS:
// Clerk handles authentication (login/signup), but we need user data in our own
// database to create relationships (posts, likes, comments belong to users).
// This webhook keeps our database in sync with Clerk.
//
// SECURITY:
// Webhooks need to be verified to prevent fake requests. Clerk uses "Svix"
// (a webhook delivery service) that signs each request. We verify that signature
// to ensure the request actually came from Clerk, not a malicious actor.

import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // Step 1: Get the webhook secret from environment variables
  // You set this up in Clerk Dashboard > Webhooks > your webhook > Signing Secret
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("CLERK_WEBHOOK_SECRET is not set in environment variables");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  // Step 2: Get the Svix headers from the request
  // These headers contain the signature that proves this request came from Clerk
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If any of these headers are missing, the request is invalid
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error("Missing Svix headers - request may not be from Clerk");
    return NextResponse.json(
      { error: "Missing webhook headers" },
      { status: 400 }
    );
  }

  // Step 3: Get the raw body of the request
  // We need the exact bytes that were signed, not a parsed version
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Step 4: Verify the webhook signature
  // This is like checking a wax seal on a letter - it proves authenticity
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 400 }
    );
  }

  // Step 5: Handle the webhook event based on its type
  const eventType = evt.type;

  try {
    switch (eventType) {
      // USER CREATED or UPDATED - Create or update the user in our database
      case "user.created":
      case "user.updated": {
        const { id, email_addresses, username, first_name, last_name, image_url } = evt.data;

        // Get the primary email (users can have multiple emails in Clerk)
        const primaryEmail = email_addresses.find(
          (email) => email.id === evt.data.primary_email_address_id
        );

        if (!primaryEmail) {
          console.error("No primary email found for user:", id);
          return NextResponse.json(
            { error: "No primary email found" },
            { status: 400 }
          );
        }

        // Build the full name from first and last name
        const fullName = [first_name, last_name].filter(Boolean).join(" ") || null;

        // Upsert = "Update if exists, Insert if not"
        // This handles both user.created and user.updated events
        await db.user.upsert({
          where: { id },
          update: {
            email: primaryEmail.email_address,
            username: username || null,
            name: fullName,
            imageUrl: image_url || null,
            // Note: We don't update bio or reputation here - those are managed by our app
          },
          create: {
            id,
            email: primaryEmail.email_address,
            username: username || null,
            name: fullName,
            imageUrl: image_url || null,
            // bio and reputation use default values from schema
          },
        });

        console.log(`User ${eventType === "user.created" ? "created" : "updated"}:`, id);
        break;
      }

      // USER DELETED - Remove the user from our database
      case "user.deleted": {
        const { id } = evt.data;

        if (!id) {
          console.error("No user ID provided in user.deleted event");
          return NextResponse.json(
            { error: "No user ID provided" },
            { status: 400 }
          );
        }

        // Delete the user - Prisma will cascade delete their posts, likes, comments
        // (because we set onDelete: Cascade in the schema)
        await db.user.delete({
          where: { id },
        });

        console.log("User deleted:", id);
        break;
      }

      // Other event types we don't handle yet
      default:
        console.log("Unhandled webhook event type:", eventType);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error processing webhook:", error);

    // If the user doesn't exist when trying to delete, that's okay
    if (
      error instanceof Error &&
      error.message.includes("Record to delete does not exist")
    ) {
      console.log("User already deleted or never existed in our database");
      return NextResponse.json({ success: true }, { status: 200 });
    }

    return NextResponse.json(
      { error: "Error processing webhook" },
      { status: 500 }
    );
  }
}
