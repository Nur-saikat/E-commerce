import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toast } from './shared/components/toast/toast';
import { ConfirmDialog } from './shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Toast, ConfirmDialog],
  template: `
    <router-outlet />
    <app-toast />
    <app-confirm-dialog />
  `
})
export class App {}
