import { Injectable, signal, inject, effect } from '@angular/core';
import { PluginStoreService } from '../../../core/services/plugin-store.service';
import { UserProfileService } from '../../../core/services/user-profile.service';
import type { Plant } from '../models/plant.model';
import type { GardeningTask } from '../models/gardening-task.model';
import type { Zone } from '../models/zone.model';
import type { GardenJob } from '../models/garden-job.model';
import { GARDENER_PLUGIN_ID, PLANTS_KEY, TASKS_KEY, ZONES_KEY, JOBS_KEY } from './gardener-store.constants';

@Injectable({ providedIn: 'root' })
export class GardenerPersistenceService {
  private store = inject(PluginStoreService);
  private userProfile = inject(UserProfileService);

  private plantsSignal = signal<Plant[]>([]);
  private tasksSignal = signal<GardeningTask[]>([]);
  private zonesSignal = signal<Zone[]>([]);
  private jobsSignal = signal<GardenJob[]>([]);
  private loaded = false;
  private loadedUserId: string | undefined;
  private loadRequested = signal(false);

  readonly plants = this.plantsSignal.asReadonly();
  readonly tasks = this.tasksSignal.asReadonly();
  readonly zones = this.zonesSignal.asReadonly();
  readonly jobs = this.jobsSignal.asReadonly();

  constructor() {
    effect(() => {
      const id = this.userProfile.profile()?.id;
      if (!id) {
        this.plantsSignal.set([]);
        this.tasksSignal.set([]);
        this.zonesSignal.set([]);
        this.jobsSignal.set([]);
        this.loaded = false;
        this.loadedUserId = undefined;
        return;
      }
      if (this.loadedUserId !== id) {
        this.plantsSignal.set([]);
        this.tasksSignal.set([]);
        this.zonesSignal.set([]);
        this.jobsSignal.set([]);
        this.loaded = false;
        this.loadedUserId = id;
      }
      if (this.loadRequested() && !this.loaded) {
        this.loaded = true;
        this.fetch(id);
      }
    });
  }

  load(): void {
    this.userProfile.load();
    this.loadRequested.set(true);
  }

  private getUserId(): string | undefined {
    return this.userProfile.profile()?.id;
  }

  savePlants(plants: Plant[]): void {
    this.plantsSignal.set(plants);
    const userId = this.getUserId();
    if (userId) {
      this.store.put(GARDENER_PLUGIN_ID, PLANTS_KEY, plants, userId).subscribe({ error: () => {} });
    }
  }

  saveTasks(tasks: GardeningTask[]): void {
    this.tasksSignal.set(tasks);
    const userId = this.getUserId();
    if (userId) {
      this.store.put(GARDENER_PLUGIN_ID, TASKS_KEY, tasks, userId).subscribe({ error: () => {} });
    }
  }

  saveZones(zones: Zone[]): void {
    this.zonesSignal.set(zones);
    const userId = this.getUserId();
    if (userId) {
      this.store.put(GARDENER_PLUGIN_ID, ZONES_KEY, zones, userId).subscribe({ error: () => {} });
    }
  }

  saveJobs(jobs: GardenJob[]): void {
    this.jobsSignal.set(jobs);
    const userId = this.getUserId();
    if (userId) {
      this.store.put(GARDENER_PLUGIN_ID, JOBS_KEY, jobs, userId).subscribe({ error: () => {} });
    }
  }

  private fetch(userId: string): void {
    this.store.get<Plant[]>(GARDENER_PLUGIN_ID, PLANTS_KEY, userId).subscribe({
      next: (list) => this.plantsSignal.set(Array.isArray(list) ? list : []),
      error: () => this.plantsSignal.set([]),
    });
    this.store.get<GardeningTask[]>(GARDENER_PLUGIN_ID, TASKS_KEY, userId).subscribe({
      next: (list) => this.tasksSignal.set(Array.isArray(list) ? list : []),
      error: () => this.tasksSignal.set([]),
    });
    this.store.get<Zone[]>(GARDENER_PLUGIN_ID, ZONES_KEY, userId).subscribe({
      next: (list) => this.zonesSignal.set(Array.isArray(list) ? list : []),
      error: () => this.zonesSignal.set([]),
    });
    this.store.get<GardenJob[]>(GARDENER_PLUGIN_ID, JOBS_KEY, userId).subscribe({
      next: (list) => this.jobsSignal.set(Array.isArray(list) ? list : []),
      error: () => this.jobsSignal.set([]),
    });
  }
}
