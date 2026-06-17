<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('geofences', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique()->index();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('color', 7)->default('#3B82F6'); // hex color for map display
            $table->enum('type', ['circle', 'polygon'])->default('polygon');

            // For circles: center + radius in metres
            $table->decimal('center_lat', 10, 7)->nullable();
            $table->decimal('center_lng', 10, 7)->nullable();
            $table->unsignedInteger('radius_meters')->nullable();

            // Alert configuration
            $table->boolean('alert_on_enter')->default(true);
            $table->boolean('alert_on_exit')->default(true);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'is_active']);
        });

        // PostGIS polygon column for the geofence area
        DB::statement('ALTER TABLE geofences ADD COLUMN area geography(Geometry, 4326)');
        DB::statement('CREATE INDEX geofences_area_idx ON geofences USING GIST (area)');

        // Pivot: which devices are assigned to which geofences
        Schema::create('device_geofence', function (Blueprint $table) {
            $table->foreignId('device_id')->constrained()->cascadeOnDelete();
            $table->foreignId('geofence_id')->constrained()->cascadeOnDelete();
            $table->primary(['device_id', 'geofence_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('device_geofence');
        DB::statement('DROP INDEX IF EXISTS geofences_area_idx');
        Schema::dropIfExists('geofences');
    }
};
