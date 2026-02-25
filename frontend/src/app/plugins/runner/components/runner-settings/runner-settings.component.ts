import { Component, inject, signal } from '@angular/core';
import { RunnerPlanService, RUNNER_PLAN_TEMPLATE, parseUploadedPlan } from '../../services/runner-plan.service';
import { StravaService } from '../../services/strava.service';

@Component({
  selector: 'app-runner-settings',
  standalone: true,
  templateUrl: './runner-settings.component.html',
})
export class RunnerSettingsComponent {
  readonly strava = inject(StravaService);
  readonly runnerPlan = inject(RunnerPlanService);

  readonly uploadMessage = signal('');
  readonly uploadError = signal(false);

  downloadTemplate(): void {
    const json = JSON.stringify(RUNNER_PLAN_TEMPLATE, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'runner-plan-template.json';
    a.click();
    URL.revokeObjectURL(url);
    this.uploadMessage.set('Template downloaded. Fill the "runs" array and upload here.');
    this.uploadError.set(false);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string);
        const runs = parseUploadedPlan(json);
        if (runs && runs.length > 0) {
          this.runnerPlan.setUploadedRuns(runs);
          this.uploadMessage.set(`Uploaded ${runs.length} run(s). Open Run Planner to view or add to calendar.`);
          this.uploadError.set(false);
        } else {
          this.uploadMessage.set('No valid runs in file. Use the template format: { "runs": [ { "date": "YYYY-MM-DD", "distanceKm": number, "title": "Run X km" } ] }');
          this.uploadError.set(true);
        }
      } catch {
        this.uploadMessage.set('Invalid JSON. Download the template and use that format.');
        this.uploadError.set(true);
      }
    };
    reader.readAsText(file);
  }
}
