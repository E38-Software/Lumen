import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-aside',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="aside-logo flex-column-auto" id="kt_aside_logo">
      <a routerLink="/dashboard">
        <img alt="Logo" src="assets/media/logos/default-small.svg" class="h-25px logo" />
      </a>
    </div>
    <div class="aside-menu flex-column-fluid">
      <div class="hover-scroll-overlay-y my-5 my-lg-5" id="kt_aside_menu_wrapper" data-kt-scroll="true"
        data-kt-scroll-activate="{default: false, lg: true}" data-kt-scroll-height="auto"
        data-kt-scroll-dependencies="#kt_aside_logo, #kt_aside_footer" data-kt-scroll-wrappers="#kt_aside_menu"
        data-kt-scroll-offset="0">
        <div class="menu menu-column menu-title-gray-800 menu-state-title-primary menu-state-icon-primary menu-state-bullet-primary menu-arrow-gray-500"
          id="#kt_aside_menu" data-kt-menu="true" data-kt-menu-expand="false">
          
          <div class="menu-item">
            <div class="menu-content pt-8 pb-2">
              <span class="menu-section text-muted text-uppercase fs-8 ls-1">Dashboard</span>
            </div>
          </div>
          
          <div class="menu-item">
            <a class="menu-link" routerLink="/dashboard" routerLinkActive="active">
              <span class="menu-icon">
                <i class="ki-duotone ki-element-11 fs-2">
                  <span class="path1"></span>
                  <span class="path2"></span>
                  <span class="path3"></span>
                  <span class="path4"></span>
                </i>
              </span>
              <span class="menu-title">Dashboard</span>
            </a>
          </div>
          
        </div>
      </div>
    </div>
  `,
  styleUrls: []
})
export class AsideComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
