import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-quotes',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RouterLink
  ],
  templateUrl: './quotes.html',
  styleUrls: ['./quotes.scss']
})
export class QuotesComponent implements OnInit {
  // URL directa a tu backend en Railway
  apiUrl = 'https://bot-wa-back-production.up.railway.app/quotes';
  quotes: any[] = [];
  whatsappPhone: string = '';
  
  isLoading: boolean = false;
  quoteToDeleteId: number | null = null;
  showDeleteModal: boolean = false;

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
    this.loadQuotes();
  }

loadQuotes() {
    this.isLoading = true;
    const body = { whatsappPhone: this.whatsappPhone };

    this.http.post<any[]>(`${this.apiUrl}/list`, body).subscribe({
      next: (data) => {
        this.quotes = data || [];
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.quotes = [];
        this.showToast('No se pudieron cargar las cotizaciones', 'danger');
      }
    });
  }

  confirmDelete(id: number) {
    this.quoteToDeleteId = id;
    this.showDeleteModal = true;
  }

  cancelDelete() {
    this.quoteToDeleteId = null;
    this.showDeleteModal = false;
  }

  deleteQuoteConfirmed() {
    if (!this.quoteToDeleteId) return;

    this.http.delete(`${this.apiUrl}/${this.quoteToDeleteId}`).subscribe({
      next: () => {
        this.showToast('Cotización eliminada exitosamente', 'success');
        this.loadQuotes();
        this.cancelDelete();
      },
      error: () => {
        this.showToast('Error al eliminar la cotización', 'danger');
      }
    });
  }

  showToast(message: string, color: string) {
    this.toastMessage = message;
    this.toastType = color;
    setTimeout(() => {
      this.toastMessage = null;
    }, 3000);
  }
}