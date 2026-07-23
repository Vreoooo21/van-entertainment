VAN AUDITION WHATSAPP NOTIFICATION
=================================

FILES
- js/public-audition.js
- supabase/functions/notify-audition/index.ts
- supabase/config.toml
- whatsapp-notification-migration.sql

1. Copy the files into the same paths in your VAN project.
2. Run whatsapp-notification-migration.sql in Supabase SQL Editor.
3. Create an approved WhatsApp template in Meta WhatsApp Manager:

   Template name: van_audition_notification
   Language: Indonesian (id)
   Suggested category: Utility

   Body:
   Pendaftaran audisi baru VAN ENTERTAINMENT
   Kode: {{1}}
   Program: {{2}}
   Nama: {{3}}
   Kategori: {{4}}
   WhatsApp kandidat: {{5}}
   Portfolio: {{6}}

4. Deploy the Edge Function named notify-audition.
5. Add these Edge Function secrets:

   META_WA_ACCESS_TOKEN
   META_WA_PHONE_NUMBER_ID
   VAN_ADMIN_WHATSAPP          (example: 6281234567890)
   META_WA_TEMPLATE_NAME       (van_audition_notification)
   META_WA_TEMPLATE_LANGUAGE   (id)
   META_GRAPH_VERSION          (use the version shown by Meta)
   VAN_WEBHOOK_SECRET          (make a long random value)

6. Create a Supabase Database Webhook:
   Name: notify-new-audition
   Table: public.audition_applications
   Event: INSERT
   Method: POST
   URL: https://YOUR_PROJECT_REF.supabase.co/functions/v1/notify-audition
   Header: x-van-webhook-secret = the same VAN_WEBHOOK_SECRET

7. Submit a test audition and inspect:
   - Supabase Edge Functions -> notify-audition -> Logs
   - Table audition_applications columns notification_status and notification_error

The public form no longer directly invokes the function. The database webhook is the only trigger,
which avoids duplicate notifications and still works if the visitor closes the page immediately.
