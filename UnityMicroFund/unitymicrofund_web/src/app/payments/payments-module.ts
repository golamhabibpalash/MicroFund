import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PaymentsRoutingModule } from './payments-routing-module';

@NgModule({
  imports: [CommonModule, PaymentsRoutingModule],
})
export class PaymentsModule {}
