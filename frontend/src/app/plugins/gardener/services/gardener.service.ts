import { Injectable, inject } from '@angular/core';
import type { Plant } from '../models/plant.model';
import type { GardeningTask } from '../models/gardening-task.model';
import type { Zone } from '../models/zone.model';
import type { GardenJob } from '../models/garden-job.model';
import { generateId } from '../../../core/utils/id';
import { GardenerPersistenceService } from './gardener-persistence.service';

@Injectable({ providedIn: 'root' })
export class GardenerService {
  private persistence = inject(GardenerPersistenceService);

  readonly plants = this.persistence.plants;
  readonly tasks = this.persistence.tasks;
  readonly zones = this.persistence.zones;
  readonly jobs = this.persistence.jobs;

  load(): void {
    this.persistence.load();
  }

  addPlant(plant: Partial<Plant> & { name: string }): Plant {
    const newPlant: Plant = {
      ...plant,
      id: generateId(),
      name: plant.name,
      addedDate: plant.addedDate ?? new Date().toISOString().slice(0, 10),
    };
    this.persistence.savePlants([...this.persistence.plants(), newPlant]);
    return newPlant;
  }

  updatePlant(id: string, updates: Partial<Plant>): void {
    const list = this.persistence.plants().map((p) =>
      p.id === id ? { ...p, ...updates } : p
    );
    this.persistence.savePlants(list);
  }

  removePlant(id: string): void {
    this.persistence.savePlants(this.persistence.plants().filter((p) => p.id !== id));
    // Remove this plant from any job's plantIds (one-way link)
    const jobs = this.persistence.jobs().map((j) =>
      j.plantIds?.length ? { ...j, plantIds: j.plantIds.filter((pid) => pid !== id) } : j
    );
    this.persistence.saveJobs(jobs);
  }

  addTask(task: Partial<GardeningTask> & { date: string; title: string }): GardeningTask {
    const newTask: GardeningTask = {
      id: generateId(),
      date: task.date,
      title: task.title,
      notes: task.notes,
    };
    this.persistence.saveTasks([...this.persistence.tasks(), newTask]);
    return newTask;
  }

  updateTask(id: string, updates: Partial<GardeningTask>): void {
    const list = this.persistence.tasks().map((t) =>
      t.id === id ? { ...t, ...updates } : t
    );
    this.persistence.saveTasks(list);
  }

  removeTask(id: string): void {
    this.persistence.saveTasks(this.persistence.tasks().filter((t) => t.id !== id));
  }

  addZone(zone: Partial<Zone> & { name: string }): Zone {
    const newZone: Zone = {
      id: generateId(),
      name: zone.name.trim(),
      description: zone.description?.trim() || undefined,
    };
    this.persistence.saveZones([...this.persistence.zones(), newZone]);
    return newZone;
  }

  updateZone(id: string, updates: Partial<Zone>): void {
    const list = this.persistence.zones().map((z) =>
      z.id === id ? { ...z, ...updates } : z
    );
    this.persistence.saveZones(list);
  }

  removeZone(id: string): void {
    this.persistence.saveZones(this.persistence.zones().filter((z) => z.id !== id));
    // Remove this zone from all plants
    const plants = this.persistence.plants().map((p) => ({
      ...p,
      zoneIds: (p.zoneIds ?? []).filter((zid) => zid !== id),
    }));
    this.persistence.savePlants(plants);
    // Clear zone from jobs that referenced it
    const jobs = this.persistence.jobs().map((j) =>
      j.zoneId === id ? { ...j, zoneId: undefined } : j
    );
    this.persistence.saveJobs(jobs);
  }

  addJob(job: Partial<GardenJob> & { title: string; startDate: string }): GardenJob {
    const materials = Array.isArray(job.materials)
      ? job.materials
          .filter((m) => m?.name?.trim())
          .map((m) => ({ name: m.name.trim(), cost: m.cost != null ? Number(m.cost) : undefined }))
      : undefined;
    const plantIds = Array.isArray(job.plantIds) ? job.plantIds.filter(Boolean) : undefined;
    const newJob: GardenJob = {
      id: generateId(),
      title: job.title.trim(),
      startDate: job.startDate,
      endDate: job.endDate?.trim() || undefined,
      zoneId: job.zoneId?.trim() || undefined,
      plantIds: plantIds?.length ? plantIds : undefined,
      materials: materials?.length ? materials : undefined,
      addedDate: job.addedDate ?? new Date().toISOString().slice(0, 10),
    };
    this.persistence.saveJobs([...this.persistence.jobs(), newJob]);
    return newJob;
  }

  updateJob(id: string, updates: Partial<GardenJob>): void {
    const list = this.persistence.jobs().map((j) =>
      j.id === id ? { ...j, ...updates } : j
    );
    this.persistence.saveJobs(list);
  }

  removeJob(id: string): void {
    this.persistence.saveJobs(this.persistence.jobs().filter((j) => j.id !== id));
  }
}
