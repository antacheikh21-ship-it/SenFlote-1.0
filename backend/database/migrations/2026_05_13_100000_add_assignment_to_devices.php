<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Make company_id nullable so unassigned devices can exist in the super-admin pool
        DB::statement('ALTER TABLE devices ALTER COLUMN company_id DROP NOT NULL');

        Schema::table('devices', function (Blueprint $table) {
            // Optional assignment to a specific user within the company
            $table->foreignId('assigned_user_id')->nullable()->after('company_id')
                  ->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('devices', function (Blueprint $table) {
            $table->dropForeign(['assigned_user_id']);
            $table->dropColumn('assigned_user_id');
        });

        DB::statement('ALTER TABLE devices ALTER COLUMN company_id SET NOT NULL');
    }
};
