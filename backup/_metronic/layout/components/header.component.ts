import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="container-fluid d-flex align-items-stretch justify-content-between">
      <div class="d-flex align-items-center d-lg-none ms-n2 me-2">
        <div class="btn btn-icon btn-active-light-primary w-30px h-30px w-md-40px h-md-40px" id="kt_aside_toggle">
          <i class="ki-duotone ki-abstract-14 fs-1">
            <span class="path1"></span>
            <span class="path2"></span>
          </i>
        </div>
      </div>

      <div class="d-flex align-items-center flex-grow-1 flex-lg-grow-0">
        <a href="#" class="d-lg-none">
          <img alt="Logo" src="assets/media/logos/default-small.svg" class="h-30px" />
        </a>
      </div>

      <div class="d-flex align-items-stretch justify-content-between flex-lg-grow-1" id="kt_header_nav">
        <div class="d-flex align-items-stretch" id="kt_header_nav_wrapper">
          <div class="header-menu align-items-stretch" data-kt-drawer="true"
            data-kt-drawer-name="header-menu" data-kt-drawer-activate="{default: true, lg: false}"
            data-kt-drawer-overlay="true" data-kt-drawer-width="{default:'200px', '300px': '250px'}"
            data-kt-drawer-direction="end" data-kt-drawer-toggle="#kt_header_menu_toggle"
            data-kt-swapper="true" data-kt-swapper-mode="prepend"
            data-kt-swapper-parent="{default: '#kt_body', lg: '#kt_header_nav'}">
            <div class="menu menu-lg-rounded menu-column menu-lg-row my-5 my-lg-0 align-items-stretch fw-semibold px-2 px-lg-0"
              id="kt_header_menu" data-kt-menu="true">
              
              <div class="menu-item me-lg-1">
                <a class="menu-link py-3" routerLink="/dashboard">
                  <span class="menu-title">Dashboard</span>
                </a>
              </div>
              
            </div>
          </div>
        </div>

        <div class="d-flex align-items-stretch flex-shrink-0">
          <div class="d-flex align-items-center ms-1 ms-lg-3">
            <div class="cursor-pointer symbol symbol-30px symbol-md-40px" id="kt_header_user_menu_toggle">
              <img alt="Avatar" src="assets/media/avatars/300-1.jpg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: []
})
export class HeaderComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
