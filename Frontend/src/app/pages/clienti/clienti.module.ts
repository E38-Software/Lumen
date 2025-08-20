import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ClientiComponent } from './clienti.component';

const routes: Routes = [
  { path: '', component: ClientiComponent }
];

@NgModule({
  declarations: [ClientiComponent],
  imports: [CommonModule, RouterModule.forChild(routes)]
})
export class ClientiModule {}
