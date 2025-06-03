import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as Parse from 'parse';
import { environment } from './environments/environment';

// Import all services
import { ParseDataService } from './services/data.service';
import { DocumentService } from './services/documents.service';
import { ParseFileService } from './services/files.service';
import { ParseRoleManger } from './services/roles.service';
import { ParseUserService } from './services/users.service';

@NgModule({
  imports: [CommonModule],
  providers: [
    ParseDataService,
    DocumentService,
    ParseFileService,
    ParseRoleManger,
    ParseUserService
  ]
})
export class ParseSdkModule {
  constructor() {
    // Initialize Parse SDK with environment configuration
    this.initializeParse();
  }

  private initializeParse(): void {
    if (environment.parseConfig) {
      Parse.initialize(
        environment.parseConfig.applicationId,
        environment.parseConfig.javascriptKey
      );
      
      if (environment.parseConfig.serverURL) {
        Parse.serverURL = environment.parseConfig.serverURL;
      }
      
      console.log('Parse SDK initialized successfully');
    } else {
      console.warn('Parse configuration not found in environment');
    }
  }
}
