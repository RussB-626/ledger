import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageData } from '../../../../core/models/index';

@Component({
  selector: 'app-common-withdrawals',
  templateUrl: './common-withdrawals.component.html',
  styleUrls: ['./common-withdrawals.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class CommonWithdrawalsComponent {
  @Input() pageData!: PageData;

  get commonDescriptions() {
    return this.pageData?.txnDescriptions.filter(d => d.is_common) || [];
  }
}
