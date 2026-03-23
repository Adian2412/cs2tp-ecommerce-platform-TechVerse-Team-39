<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Contact Form Submission</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
    .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 10px; padding: 36px; box-shadow: 0 2px 10px rgba(0,0,0,0.08); }
    .logo { font-size: 22px; font-weight: 800; color: #0f1111; margin-bottom: 24px; letter-spacing: -0.5px; }
    .logo span { color: #0d6efd; }
    .badge { display: inline-block; background: #fff3cd; color: #664d03; border: 1px solid #ffe69c; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 16px; }
    h2 { color: #111; font-size: 18px; margin: 0 0 20px; }
    .field { margin-bottom: 16px; }
    .field__label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #767676; margin-bottom: 4px; }
    .field__val { font-size: 15px; color: #111; }
    .message-box { background: #f8f9fa; border-left: 4px solid #0d6efd; border-radius: 4px; padding: 16px; margin-top: 20px; font-size: 14px; color: #333; line-height: 1.7; white-space: pre-wrap; }
    .reply-note { margin-top: 24px; padding: 12px 16px; background: #e8f0fe; border-radius: 6px; font-size: 13px; color: #084298; }
    .footer { margin-top: 32px; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">Tech<span>Verse</span></div>
    <div class="badge">New Contact Form Message</div>
    <h2>You have a new message from the website</h2>

    <div class="field">
      <div class="field__label">From</div>
      <div class="field__val">{{ $contactMessage->name }}</div>
    </div>

    <div class="field">
      <div class="field__label">Email</div>
      <div class="field__val"><a href="mailto:{{ $contactMessage->email }}" style="color:#0d6efd;">{{ $contactMessage->email }}</a></div>
    </div>

    <div class="field">
      <div class="field__label">Subject</div>
      <div class="field__val">{{ $contactMessage->subject }}</div>
    </div>

    <div class="field">
      <div class="field__label">Received</div>
      <div class="field__val">{{ $contactMessage->created_at->format('d M Y \a\t H:i') }} UTC</div>
    </div>

    <div class="field">
      <div class="field__label">Message</div>
      <div class="message-box">{{ $contactMessage->message }}</div>
    </div>

    <div class="reply-note">
      💬 To reply, simply respond to this email — your reply will go directly to <strong>{{ $contactMessage->name }}</strong> at {{ $contactMessage->email }}.
    </div>

    <div class="footer">
      &copy; {{ date('Y') }} Tech Verse Ltd &bull; Aston University, Birmingham, UK<br>
      This notification was sent because someone submitted the contact form on techverse.com.
    </div>
  </div>
</body>
</html>
