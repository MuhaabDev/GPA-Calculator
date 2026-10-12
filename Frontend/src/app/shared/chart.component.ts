import {
  Component,
  ElementRef,
  afterNextRender,
  effect,
  input,
  signal,
  viewChild,
  inject,
} from '@angular/core';
import { Chart, registerables, ChartDataset } from 'chart.js';
import { Store } from '../core/store.service';
Chart.register(...registerables);
@Component({
  selector: 'app-chart',
  standalone: true,
  template: `<div class="chart-wrap">
      <canvas #canvas role="img" [attr.aria-label]="label()"></canvas>
    </div>
    <div class="sr-only">
      <table>
        <caption>
          {{
            label()
          }}
          — chart data
        </caption>
        <thead>
          <tr>
            <th scope="col">Period or category</th>
            @for (series of datasets(); track $index) {
              <th scope="col">{{ series.label }}</th>
            }
            @if (details().length) {
              <th scope="col">Semester details</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (category of labels(); track $index; let i = $index) {
            <tr>
              <th scope="row">{{ category }}</th>
              @for (series of datasets(); track $index) {
                <td>{{ point(series, i) }}</td>
              }
              @if (details().length) {
                <td>{{ details()[i]?.join(' · ') }}</td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>`,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }
      .chart-wrap {
        height: 260px;
        position: relative;
      }
      canvas {
        max-width: 100%;
      }
    `,
  ],
})
export class ChartComponent {
  labels = input<string[]>([]);
  datasets = input<ChartDataset<'line' | 'bar'>[]>([]);
  kind = input<'line' | 'bar'>('line');
  max = input<number | undefined>();
  label = input('Academic performance chart');
  details = input<string[][]>([]);
  private canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private ready = signal(false);
  private store = inject(Store);
  point(series: ChartDataset<'line' | 'bar'>, index: number) {
    const value = series.data[index];
    return typeof value === 'number'
      ? this.max() === undefined
        ? value
        : this.store.format(value)
      : '—';
  }
  constructor() {
    afterNextRender(() => this.ready.set(true));
    effect((onCleanup) => {
      const labels = this.labels(),
        datasets = this.datasets(),
        type = this.kind(),
        max = this.max(),
        details = this.details(),
        dark = this.store.data().preferences.theme === 'dark';
      if (!this.ready()) return;
      const chart = new Chart(this.canvas().nativeElement, {
        type,
        data: {
          labels,
          datasets: datasets.map((d) => ({
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.3,
            ...d,
          })),
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 350 },
          interaction: { intersect: false, mode: 'index' },
          plugins: {
            legend: {
              display: true,
              position: 'bottom',
              align: 'start',
              labels: {
                usePointStyle: true,
                boxWidth: 6,
                boxHeight: 6,
                color: dark ? '#b9c6bd' : '#657269',
                padding: 24,
                font: { family: 'Segoe UI', size: 11 },
              },
            },
            tooltip: {
              callbacks: {
                afterBody: (items) => details[items[0]?.dataIndex] ?? [],
                label: (context) =>
                  `${context.dataset.label}: ${max === undefined ? context.parsed.y : this.store.format(context.parsed.y)}`,
              },
              backgroundColor: dark ? '#e8eee6' : '#243c30',
              titleColor: dark ? '#16251d' : '#fff',
              bodyColor: dark ? '#16251d' : '#fff',
              padding: 12,
              cornerRadius: 6,
            },
          },
          scales: {
            x: {
              grid: { display: false },
              border: { display: false },
              ticks: { color: dark ? '#99aaa0' : '#819086', font: { size: 11 } },
            },
            y: {
              min: 0,
              max,
              grid: { color: dark ? '#2c3b33' : '#edf0ea' },
              border: { display: false },
              ticks: { color: dark ? '#99aaa0' : '#819086', maxTicksLimit: 5, font: { size: 11 } },
            },
          },
        },
      });
      onCleanup(() => chart.destroy());
    });
  }
}
