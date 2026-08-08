import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-product-modal',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule
  ],
  templateUrl: './product-modal.html',
  styleUrls: ['./product-modal.scss']
})
export class ProductModalComponent implements OnInit {
  @Input() product: any = null;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<any>();

  formData = {
    name: '',
    description: '',
    price: 0,
    stock: 0,
    unit: 'pza',
    brand: '',
    sku: '',
    image_url: ''
  };

  isEditing = false;

  ngOnInit() {
    if (this.product) {
      this.isEditing = true;
      this.formData = { ...this.product };
    }
  }

  onClose() {
    this.close.emit();
  }

  onSave() {
    if (!this.formData.name || this.formData.price <= 0) {
      alert('Por favor ingresa un nombre y un precio válido.');
      return;
    }
    this.save.emit(this.formData);
  }
}