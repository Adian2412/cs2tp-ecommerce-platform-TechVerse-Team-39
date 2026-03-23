<?php

namespace App\Mail;

use App\Models\ContactMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Queue\SerializesModels;

class ContactMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly ContactMessage $contactMessage,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            to: [new Address('support@techverse.com', 'Tech Verse Support')],
            replyTo: [new Address($this->contactMessage->email, $this->contactMessage->name)],
            subject: '[Contact Form] ' . $this->contactMessage->subject,
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.contact');
    }
}
