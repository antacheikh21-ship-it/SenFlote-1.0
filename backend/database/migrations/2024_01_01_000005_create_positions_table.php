<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('positions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_id')->constrained()->cascadeOnDelete();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();

            // Core GPS data
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->decimal('altitude', 8, 2)->default(0);  // metres
            $table->decimal('speed', 6, 2)->default(0);     // km/h
            $table->smallInteger('angle')->default(0);       // heading 0-360
            $table->decimal('accuracy', 6, 2)->nullable();  // metres

            // PostGIS geometry (populated via trigger / DB::statement)
            // geography type uses SRID 4326 (WGS 84)

            // Device attributes at time of position
            $table->boolean('ignition')->default(false);
            $table->tinyInteger('gsm_signal')->nullable();
            $table->tinyInteger('battery_level')->nullable();
            $table->jsonb('attributes')->default('{}'); // raw sensor fields

            // Trip grouping (filled by TripDetection job)
            $table->unsignedBigInteger('trip_id')->nullable()->index();

            $table->timestamp('device_time');   // timestamp from the GPS device
            $table->timestamp('server_time')->useCurrent();

            $table->index(['device_id', 'device_time']);
            $table->index(['company_id', 'device_time']);
            $table->index('device_time');
        });

        // Add PostGIS geography column (not supported natively by Blueprint)
        DB::statement('ALTER TABLE positions ADD COLUMN location geography(Point, 4326)');
        DB::statement('CREATE INDEX positions_location_idx ON positions USING GIST (location)');

        // Auto-populate geography from lat/lng on insert
        DB::statement("
            CREATE OR REPLACE FUNCTION positions_set_location()
            RETURNS TRIGGER AS \$\$
            BEGIN
                NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
                RETURN NEW;
            END;
            \$\$ LANGUAGE plpgsql;
        ");

        DB::statement("
            CREATE TRIGGER trg_positions_set_location
            BEFORE INSERT OR UPDATE OF latitude, longitude
            ON positions
            FOR EACH ROW EXECUTE FUNCTION positions_set_location();
        ");
    }

    public function down(): void
    {
        DB::statement('DROP TRIGGER IF EXISTS trg_positions_set_location ON positions');
        DB::statement('DROP FUNCTION IF EXISTS positions_set_location');
        Schema::dropIfExists('positions');
    }
};
