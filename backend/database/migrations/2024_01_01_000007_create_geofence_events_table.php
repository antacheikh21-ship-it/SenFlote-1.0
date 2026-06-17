<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('geofence_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_id')->constrained()->cascadeOnDelete();
            $table->foreignId('geofence_id')->constrained()->cascadeOnDelete();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->enum('event_type', ['enter', 'exit']);
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->decimal('speed', 6, 2)->default(0);
            $table->timestamp('occurred_at');
            $table->boolean('notification_sent')->default(false);
            $table->timestamps();

            $table->index(['company_id', 'occurred_at']);
            $table->index(['device_id', 'occurred_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('geofence_events');
    }
};
