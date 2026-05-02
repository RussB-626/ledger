// Admin component - placeholder
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class AdminComponent {
  constructor(private router: Router) {}

  backToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
