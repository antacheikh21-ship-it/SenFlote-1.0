<?php

namespace App\Jobs;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ExportReport implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 2;
    public int $timeout = 120;

    public function __construct(
        private readonly string $jobId,
        private readonly int    $userId,
        private readonly int    $companyId,
        private readonly string $type,    // mileage | stops | speeding
        private readonly string $format,  // pdf | excel
        private readonly array  $params,
    ) {}

    public function handle(): void
    {
        $this->setStatus('processing');

        try {
            $data     = $this->gatherData();
            $filePath = $this->format === 'pdf'
                ? $this->renderPdf($data)
                : $this->renderExcel($data);

            $url = Storage::temporaryUrl($filePath, now()->addHours(2));

            $this->setStatus('done', ['url' => $url, 'file' => $filePath]);
        } catch (\Throwable $e) {
            Log::error('ExportReport failed', ['job_id' => $this->jobId, 'error' => $e->getMessage()]);
            $this->setStatus('failed', ['error' => $e->getMessage()]);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────

    private function gatherData(): array
    {
        // Delegates to the same query logic as the controller.
        // Extracted here so the job is self-contained without HTTP overhead.
        return match ($this->type) {
            'mileage'  => $this->mileageData(),
            'stops'    => [],   // implement same as controller
            'speeding' => [],   // implement same as controller
        };
    }

    private function mileageData(): array
    {
        return \App\Models\Trip::where('company_id', $this->companyId)
            ->where('is_complete', true)
            ->whereBetween('started_at', [
                $this->params['date_from'],
                $this->params['date_to'] . ' 23:59:59',
            ])
            ->when($this->params['device_ids'] ?? null,
                fn ($q) => $q->whereIn('device_id', $this->params['device_ids'])
            )
            ->with('device:id,name,plate_number')
            ->get()
            ->toArray();
    }

    private function renderPdf(array $data): string
    {
        /*
         * Requires: composer require barryvdh/laravel-dompdf
         *
         * $pdf  = \Barryvdh\DomPDF\Facade\Pdf::loadView(
         *     "reports.{$this->type}",
         *     ['data' => $data, 'params' => $this->params]
         * );
         * $path = "exports/report_{$this->jobId}.pdf";
         * Storage::put($path, $pdf->output());
         * return $path;
         */
        $path = "exports/report_{$this->jobId}.pdf";
        Storage::put($path, "PDF stub — install barryvdh/laravel-dompdf to activate.");
        return $path;
    }

    private function renderExcel(array $data): string
    {
        /*
         * Requires: composer require maatwebsite/excel
         *
         * \Maatwebsite\Excel\Facades\Excel::store(
         *     new \App\Exports\ReportExport($data, $this->type),
         *     $path = "exports/report_{$this->jobId}.xlsx"
         * );
         * return $path;
         */
        $path = "exports/report_{$this->jobId}.xlsx";
        Storage::put($path, "XLSX stub — install maatwebsite/excel to activate.");
        return $path;
    }

    private function setStatus(string $status, array $extra = []): void
    {
        Cache::put(
            "report_export:{$this->jobId}",
            array_merge(['status' => $status, 'job_id' => $this->jobId], $extra),
            now()->addHours(3)
        );
    }
}
