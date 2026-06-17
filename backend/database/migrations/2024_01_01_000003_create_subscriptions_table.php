<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('name');                          // Basic, Pro, Enterprise
            $table->string('slug')->unique();
            $table->integer('max_vehicles')->default(5);
            $table->integer('max_geofences')->default(10);
            $table->integer('history_days')->default(30);   // how far back trips are kept
            $table->boolean('has_reports')->default(false);
            $table->boolean('has_playback')->default(false);
            $table->boolean('has_api_access')->default(false);
            $table->unsignedInteger('price_xof')->default(0); // CFA Franc price/month
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique()->index();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('plan_id')->constrained();
            $table->enum('status', ['trialing', 'active', 'past_due', 'canceled', 'paused'])
                  ->default('trialing');
            $table->enum('billing_cycle', ['monthly', 'yearly'])->default('monthly');
            $table->timestamp('starts_at');
            $table->timestamp('ends_at')->nullable();
            $table->timestamp('canceled_at')->nullable();
            $table->string('payment_provider')->nullable(); // wave, orange_money, manual
            $table->string('payment_reference')->nullable();
            $table->jsonb('meta')->default('{}');
            $table->timestamps();

            $table->index(['company_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
        Schema::dropIfExists('plans');
    }
};
