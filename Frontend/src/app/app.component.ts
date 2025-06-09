import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ParseFileService } from './services/files.service';
import { DocumentService } from './services/documents.service';
import { Document } from './models/document.model';
import { ParseUserService } from './services/users.service';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})


export class AppComponent implements OnInit {
  title = 'ParseTypescriptSDK-angular';
  uploadedFiles: any[] = [];

  constructor(
    private _fileService: ParseFileService,
    private _documentService: DocumentService,
    private _userService: ParseUserService // Assuming you have a user service for authentication
  ) {
  }
  
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('fileInfo') fileInfo!: ElementRef<HTMLDivElement>;
  @ViewChild('fileName') fileName!: ElementRef<HTMLDivElement>;
  @ViewChild('fileSize') fileSize!: ElementRef<HTMLDivElement>;


  ngOnInit(): void {
    console.log("Component initialized");

    this._userService.login('chiara.ferraguti@e38.it', 'ciaociao').then((user) => {
      console.log("User logged in:", user);
      this._documentService.getAll().then((documents) => {
        console.log("Documents retrieved:", documents);
      }).catch((error) => {
        console.error("Error retrieving documents:", error);
      });
    }).catch((error) => {
      console.error("Error logging in user:", error);
    });

  }

  onUploadButtonClick() {
    console.log("Entro nel click");
    this.fileInput.nativeElement.click();
  }

  onFileChange(event: Event) {
    console.log("Entro nel onFileChange");
    const input = event.target as HTMLInputElement;
    const files = input.files;
    
    if (files && files.length > 0) {
      if (files.length === 1) {
        const file = files[0];
        this.fileName.nativeElement.textContent = file.name;
        this.fileSize.nativeElement.textContent = `Size: ${this.formatFileSize(file.size)}`;
      } else {
        this.fileName.nativeElement.textContent = `${files.length} files selected`;
        const totalSize = Array.from(files).reduce((sum, file) => sum + file.size, 0);
        this.fileSize.nativeElement.textContent = `Total size: ${this.formatFileSize(totalSize)}`;
      }
      
      this.fileInfo.nativeElement.classList.add('show');
      
      console.log('Selected files:', files);
      this.uploadFiles(files);
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async uploadFiles(files: FileList) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        await this.uploadSingleFile(file);
        console.log(`Uploaded: ${file.name}`);
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
      }
    }
  }

  // Update your existing uploadSingleFile method
  async uploadSingleFile(file: File) {
    try {
      const document = new Document();
      document.name = file.name;
      await this._documentService.save(document);
      console.log('File uploaded:', file.name);
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  
}
