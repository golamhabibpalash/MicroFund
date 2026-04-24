import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InvestorsComponent } from './investors.component';
import { InvestorEditComponent } from './investor-edit/investor-edit.component';

const routes: Routes = [
  { path: '', component: InvestorsComponent },
  { path: 'edit/:id', component: InvestorEditComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class InvestorsRoutingModule {}
