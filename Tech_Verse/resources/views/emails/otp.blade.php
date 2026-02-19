<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your verification code</title>
    <style>
        body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
        .container { max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 10px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.08); }
        .logo { font-size: 24px; font-weight: 700; color: #1a1a2e; margin-bottom: 24px; }
        h2 { color: #1a1a2e; margin-top: 0; }
        .otp-box { background: #f0f4ff; border: 2px solid #156082; border-radius: 8px; text-align: center; padding: 20px; margin: 24px 0; }
        .otp-code { font-size: 40px; font-weight: 700; letter-spacing: 10px; color: #156082; }
        .note { color: #555; font-size: 14px; line-height: 1.6; }
        .footer { margin-top: 32px; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 16px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">Tech Verse</div>
        <h2>Your verification code</h2>
        <p class="note">Hi {{ $userName }},</p>
        <p class="note">Use the code below to complete your sign-in. This code expires in <strong>10 minutes</strong>.</p>

        <div class="otp-box">
            <div class="otp-code">{{ $otp }}</div>
        </div>

        <p class="note">If you did not attempt to sign in, please ignore this email. Your account remains secure.</p>

        <div class="footer">
            &copy; {{ date('Y') }} Tech Verse Ltd &bull; Aston University, Birmingham, UK<br>
            This is an automated message — please do not reply.
        </div>
    </div>
</body>
</html>
