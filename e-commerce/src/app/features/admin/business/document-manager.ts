import { Component, inject, input, output, signal } from '@angular/core';
import { BusinessDocument, DOCUMENT_CATEGORIES } from '../../../core/models/business.models';
import { BusinessService } from '../../../core/services/business.service';
import { ToastService } from '../../../core/services/toast.service';
import { Icon } from '../../../shared/components/icon/icon';
import { AssetUrlPipe } from '../../../shared/pipes/asset-url.pipe';

@Component({
  selector: 'app-document-manager',
  standalone: true,
  imports: [Icon, AssetUrlPipe],
  template: `
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 class="text-sm font-semibold text-ink-900">{{ heading() }}</h3>
          <p class="text-xs text-ink-400">{{ hint() }}</p>
        </div>
        @if (canManage()) {
          <label class="btn-outline btn-sm cursor-pointer" [class.opacity-60]="uploading()">
            <app-icon name="upload" [size]="14" />
            {{ uploading() ? 'Uploading…' : 'Upload document' }}
            <input
              type="file"
              accept=".pdf,.doc,.docx,image/jpeg,image/png"
              class="hidden"
              [disabled]="uploading()"
              (change)="onFile($event)"
            />
          </label>
        }
      </div>

      <div class="space-y-2">
        @for (document of documents(); track document.id) {
          <div class="flex items-center gap-3 rounded-xl border border-ink-100 px-3 py-2.5">
            <span class="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-ink-50 text-ink-600">
              <app-icon name="receipt" [size]="16" />
            </span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-ink-900">{{ document.title }}</p>
              <p class="text-[11px] text-ink-400">
                {{ document.category }} · {{ document.fileName }} · {{ formatSize(document.size) }}
              </p>
            </div>
            <a
              [href]="document.url | assetUrl"
              target="_blank"
              rel="noopener"
              class="rounded-lg p-1.5 text-ink-500 hover:bg-ink-50 hover:text-ink-900"
              title="Open document"
            >
              <app-icon name="external-link" [size]="15" />
            </a>
            @if (canManage()) {
              <button
                type="button"
                class="rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-danger"
                title="Remove document"
                (click)="remove(document)"
              >
                <app-icon name="trash" [size]="15" />
              </button>
            }
          </div>
        } @empty {
          <p class="rounded-xl border border-dashed border-ink-200 px-4 py-6 text-center text-xs text-ink-400">
            No documents attached yet.
          </p>
        }
      </div>
    </div>
  `
})
export class DocumentManager {
  private readonly business = inject(BusinessService);
  private readonly toast = inject(ToastService);

  readonly documents = input<BusinessDocument[]>([]);
  readonly canManage = input(true);
  readonly heading = input('Documents');
  readonly hint = input('CVs, contracts, IDs and certificates. PDF, Word or image up to 10 MB.');
  readonly category = input<string>('Other');

  readonly documentsChange = output<BusinessDocument[]>();
  readonly uploading = signal(false);

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      this.toast.error(`${file.name} is larger than 10 MB`);
      return;
    }
    const category = DOCUMENT_CATEGORIES.includes(this.category() as never) ? this.category() : 'Other';
    this.uploading.set(true);
    this.business.uploadDocument(file, undefined, category).subscribe({
      next: (document) => {
        this.uploading.set(false);
        this.documentsChange.emit([...this.documents(), document]);
        this.toast.success(`${document.title} uploaded`);
      },
      error: (err) => {
        this.uploading.set(false);
        this.toast.error(err?.error?.message ?? 'Unable to upload document');
      }
    });
  }

  remove(document: BusinessDocument): void {
    this.documentsChange.emit(this.documents().filter((item) => item.id !== document.id));
    this.toast.info(`${document.title} removed — save to apply`);
  }

  formatSize(bytes: number): string {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${bytes} B`;
  }
}
