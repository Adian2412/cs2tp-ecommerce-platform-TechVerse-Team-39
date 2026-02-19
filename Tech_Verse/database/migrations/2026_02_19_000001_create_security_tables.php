<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add password_hash column to users if it doesn't exist
        if (Schema::hasTable('users') && !Schema::hasColumn('users', 'password_hash')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('password_hash')->after('email');
                $table->string('role')->default('customer')->after('password_hash');
            });
        }

        // MFA tokens
        if (!Schema::hasTable('mfa_tokens')) {
            Schema::create('mfa_tokens', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
                $table->string('token_hash', 64);
                $table->timestamp('expires_at');
                $table->boolean('used')->default(false);
                $table->timestamps();
                $table->index(['user_id', 'used']);
            });
        }

        // GDPR consent log
        if (!Schema::hasTable('gdpr_consent_log')) {
            Schema::create('gdpr_consent_log', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id')->nullable();
                $table->string('consent_type', 50);
                $table->string('ip_hash', 64);
                $table->string('user_agent', 255)->nullable();
                $table->timestamp('created_at')->useCurrent();
                $table->index('user_id');
            });
        }

        // GDPR deletion requests
        if (!Schema::hasTable('gdpr_deletion_requests')) {
            Schema::create('gdpr_deletion_requests', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
                $table->string('status', 20)->default('pending');
                $table->string('ip_hash', 64);
                $table->timestamp('requested_at')->useCurrent();
                $table->timestamp('processed_at')->nullable();
                $table->timestamps();
            });
        }

        // Audit log
        if (!Schema::hasTable('audit_log')) {
            Schema::create('audit_log', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id')->nullable();
                $table->string('action', 100);
                $table->string('ip_hash', 64);
                $table->json('context')->nullable();
                $table->timestamp('created_at')->useCurrent();
                $table->index(['user_id', 'action']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_log');
        Schema::dropIfExists('gdpr_deletion_requests');
        Schema::dropIfExists('gdpr_consent_log');
        Schema::dropIfExists('mfa_tokens');
    }
};
