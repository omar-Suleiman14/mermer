"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function OnlineBookingNotifier() {
  const { user, isLoaded } = useUser();
  const vapidPublicKey = useQuery(api.push.getVapidPublicKey);
  const saveSubscription = useMutation(api.push.saveSubscription);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!isLoaded || !user || !vapidPublicKey || isSubscribed) return;

    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then(async (subscription) => {
          let needsSubscribe = true;

          if (subscription) {
            // Compare existing key with current VAPID key
            const currentKeyBuffer = subscription.options.applicationServerKey;
            const expectedKeyArray = urlBase64ToUint8Array(vapidPublicKey!);
            const expectedKeyBuffer = expectedKeyArray.buffer;

            let isSameKey = false;
            if (currentKeyBuffer && currentKeyBuffer.byteLength === expectedKeyBuffer.byteLength) {
              const currentView = new Uint8Array(currentKeyBuffer);
              const expectedView = new Uint8Array(expectedKeyBuffer);
              isSameKey = currentView.every((val, i) => val === expectedView[i]);
            }

            if (isSameKey) {
              needsSubscribe = false;
              saveSub(subscription);
              setIsSubscribed(true);
            } else {
              console.log("VAPID key changed, unsubscribing old subscription");
              await subscription.unsubscribe();
            }
          }

          if (needsSubscribe && Notification.permission === "granted") {
            subscribeUser(registration);
          }
        });
      });
    }

    async function subscribeUser(registration: ServiceWorkerRegistration) {
      try {
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey!),
        });
        await saveSub(subscription);
        setIsSubscribed(true);
      } catch (err) {
        console.error("Failed to subscribe user: ", err);
      }
    }

    async function saveSub(subscription: PushSubscription) {
      const subJson = subscription.toJSON();
      await saveSubscription({
        clerkId: user!.id,
        endpoint: subJson.endpoint!,
        p256dh: subJson.keys!.p256dh!,
        auth: subJson.keys!.auth!,
      });
    }
  }, [isLoaded, user, vapidPublicKey, isSubscribed, saveSubscription]);

  return null;
}
