<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('trips', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique()->index();
            $table->foreignId('device_id')->constrained()->cascadeOnDelete();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();

            $table->decimal('start_lat', 10, 7);
            $table->decimal('start_lng', 10, 7);
            $table->decimal('end_lat', 10, 7)->nullable();
            $table->decimal('end_lng', 10, 7)->nullable();

            $table->string('start_address')->nullable();
            $table->string('end_address')->nullable();

            $table->timestamp('started_at');
            $table->timestamp('ended_at')->nullable();

            $table->decimal('distance_km', 10, 3)->default(0);
            $table->decimal('max_speed', 6, 2)->default(0);
            $table->decimal('avg_speed', 6, 2)->default(0);
            $table->unsignedInteger('duration_seconds')->default(0);

            $table->boolean('is_complete')->default(false);
            $table->timestamps();

            $table->index(['device_id', 'started_at']);
            $table->index(['company_id', 'started_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trips');
    }
};
