import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { VideoComponent } from './video.component';

const routes: Routes = [
  { path: '', component: VideoComponent }
];

@NgModule({
  declarations: [VideoComponent],
  imports: [CommonModule, RouterModule.forChild(routes)]
})
export class VideoModule {}
