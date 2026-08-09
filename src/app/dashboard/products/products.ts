import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';
import { ProductModalComponent } from "./product-modal/product-modal";

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ProductModalComponent,
    
],
  templateUrl: './products.html',
  styleUrls: ['./products.scss']
})
export class ProductsComponent implements OnInit {
  apiUrl = 'https://bot-wa-back-production.up.railway.app/products';
  products: any[] = [];
  filteredProducts: any[] = [];
  searchTerm: string = '';
  whatsappPhone: string = ''; 
  // Imagen por defecto en formato SVG Data URI para evitar peticiones HTTP y errores 404
defaultProductImage: string = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="%2394a3b8" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7v10l8 4M12 3v10"/></svg>';
  
  // Variables de paginación
  currentPage: number = 1;
  pageSize: number = 10; 
  totalPages: number = 1;
  paginatedProducts: any[] = [];
  
  isLoading: boolean = false;
  isDeleteModalOpen: boolean = false;
  productToDelete: any = null;

  // Estados para modales de creación/edición
  isProductModalOpen: boolean = false;
  selectedProductForEdit: any = null;

  // Notificación flotante web nativa
  toastMessage: string | null = null;
  toastType: string = 'success';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    const loggedUser = localStorage.getItem('user');
    if (loggedUser) {
      try {
        const userObj = JSON.parse(loggedUser);
        this.whatsappPhone = userObj.whatsapp_phone || ''; 
      } catch (e) {
        console.error('Error parsing user', e);
      }
    }

    this.loadProducts();
  }

loadProducts() {
    this.isLoading = true;
    const body = { whatsappPhone: this.whatsappPhone };

    this.http.post<any[]>(`${this.apiUrl}/list`, body).subscribe({
      next: (data) => {
        this.products = data || [];
        this.filteredProducts = this.products;
        this.filterProducts(); 
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.products = [];
        this.filteredProducts = [];
        this.paginatedProducts = [];
        this.showToast('Aún no se cuenta con productos registrados', 'danger');
      }
    });
  }
  openAddModal() {
    this.selectedProductForEdit = null;
    this.isProductModalOpen = true;
  }

  openEditModal(product: any) {
    this.selectedProductForEdit = { ...product };
    this.isProductModalOpen = true;
  }

  closeProductModal() {
    this.isProductModalOpen = false;
    this.selectedProductForEdit = null;
  }

  saveProductData(productData: any) {
    this.isLoading = true;
    const isEditing = !!this.selectedProductForEdit;
    const url = isEditing 
      ? `${this.apiUrl}/${this.selectedProductForEdit.id}` 
      : `${this.apiUrl}/${this.whatsappPhone || '9516493519'}`;
    
    const request$ = isEditing 
      ? this.http.patch(url, productData) 
      : this.http.post(url, productData);

    request$.subscribe({
      next: () => {
        this.isLoading = false;
        this.showToast(isEditing ? 'Producto actualizado correctamente' : 'Producto creado exitosamente', 'success');
        this.searchTerm = '';
        this.closeProductModal();
        this.loadProducts();
      },
      error: () => {
        this.isLoading = false;
        this.showToast('Error al procesar el producto', 'danger');
      }
    });
  }

  confirmDelete(product: any) {
    this.productToDelete = product;
    this.isDeleteModalOpen = true;
  }

  cancelDelete() {
    this.productToDelete = null;
    this.isDeleteModalOpen = false;
  }

  deleteProductConfirmed() {
    if (!this.productToDelete) return;

    this.http.delete(`${this.apiUrl}/${this.productToDelete.id}`).subscribe({
      next: () => {
        this.showToast('Producto eliminado exitosamente', 'success');
        this.loadProducts();
        this.cancelDelete();
      },
      error: () => {
        this.showToast('No se pudo eliminar el producto', 'danger');
      }
    });
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;

    if (!this.whatsappPhone) {
      this.showToast('No se encontró el teléfono del bot vinculado', 'warning');
      event.target.value = '';
      return;
    }

    // Reemplazamos el confirm nativo por SweetAlert2 con diseño corporativo
    Swal.fire({
      title: '¿Importar Catálogo?',
      text: `Estás a punto de importar el archivo "${file.name}". Esto agregará o actualizará los productos en tu catálogo.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, importar',
      cancelButtonText: 'Cancelar',
      background: '#ffffff',
      color: '#0f172a',
      customClass: {
        popup: 'swal-custom-popup'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.isLoading = true;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('whatsappPhone', this.whatsappPhone); // 👈 Se envía oculto en el cuerpo FormData

        this.http.post<any>(`${this.apiUrl}/upload-excel`, formData).subscribe({
          next: (res) => {
            this.isLoading = false;
            if (res && res.success) {
              Swal.fire({
                title: '¡Importado!',
                text: res.message || 'Catálogo importado correctamente',
                icon: 'success',
                confirmButtonColor: '#2563eb'
              });
              this.searchTerm = '';
              this.loadProducts();
            } else {
              Swal.fire({
                title: 'Error',
                text: res.message || 'Error al importar archivo',
                icon: 'error',
                confirmButtonColor: '#2563eb'
              });
            }
            event.target.value = ''; 
          },
          error: () => {
            this.isLoading = false;
            Swal.fire({
              title: 'Error de conexión',
              text: 'No se pudo conectar con el servidor para subir el Excel',
              icon: 'error',
              confirmButtonColor: '#2563eb'
            });
            event.target.value = '';
          }
        });
      } else {
        event.target.value = '';
      }
    });
  }

  filterProducts() {
    const term = this.searchTerm ? this.searchTerm.toLowerCase().trim() : '';
    let result = this.products;

    if (term) {
      result = this.products.filter(p => 
        (p.name && p.name.toLowerCase().includes(term)) || 
        (p.brand && p.brand.toLowerCase().includes(term)) ||
        (p.sku && p.sku.toLowerCase().includes(term))
      );
    }

    this.totalPages = Math.ceil(result.length / this.pageSize) || 1;
    if (this.currentPage > this.totalPages) this.currentPage = 1;

    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.paginatedProducts = result.slice(startIndex, startIndex + this.pageSize);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.filterProducts();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.filterProducts();
    }
  }

  showToast(message: string, color: string) {
    this.toastMessage = message;
    this.toastType = color;
    setTimeout(() => {
      this.toastMessage = null;
    }, 3000);
  }
}