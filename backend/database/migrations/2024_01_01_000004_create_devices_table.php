<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('devices', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique()->index();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();

            // Traccar linkage
            $table->string('traccar_unique_id')->unique(); // IMEI or custom ID sent by device
            $table->unsignedBigInteger('traccar_device_id')->nullable(); // Traccar internal ID

            // Vehicle metadata
            $table->string('name');                        // "Camion Dakar-01"
            $table->string('plate_number')->nullable();
            $table->string('make')->nullable();            // Toyota
            $table->string('model')->nullable();           // Hilux
            $table->year('year')->nullable();
            $table->string('color')->nullable();
            $table->enum('vehicle_type', ['car', 'truck', 'motorcycle', 'bus', 'other'])
                  ->default('car');

            // Live state (updated on each position ingestion)
            $table->enum('status', ['moving', 'idle', 'offline', 'stopped'])
                  ->default('offline');
            $table->decimal('last_speed', 6, 2)->default(0); // km/h
            $table->decimal('last_lat', 10, 7)->nullable();
            $table->decimal('last_lng', 10, 7)->nullable();
            $table->smallInteger('last_angle')->nullable();   // heading 0-360
            $table->boolean('ignition')->default(false);
            $table->tinyInteger('gsm_signal')->nullable();   // 0-5
            $table->tinyInteger('battery_level')->nullable(); // 0-100
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamp('last_moved_at')->nullable();

            $table->boolean('is_active')->default(true);
            $table->jsonb('attributes')->default('{}'); // custom sensor data
            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'status']);
            $table->index('last_seen_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('devices');
    }
};
