import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-leads',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RouterLink
  ],
  templateUrl: './leads.html',
  styleUrls: ['./leads.scss']
})
export class LeadsComponent implements OnInit {
  // URL directa a tu backend en Railway
  apiUrl = 'https://bot-wa-back-production.up.railway.app/leads';
  leads: any[] = [];
  whatsappPhone: string = '';
  
  isLoading: boolean = false;
  isDeleteModalOpen: boolean = false;
  leadToDeleteId: number | null = null;

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
    this.loadLeads();
  }

loadLeads() {
    this.isLoading = true;
    const body = { whatsappPhone: this.whatsappPhone };

    this.http.post<any[]>(`${this.apiUrl}/list`, body).subscribe({
      next: (data) => {
        this.leads = data || [];
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.leads = [];
        this.showToast('No se pudieron cargar los leads', 'danger');
      }
    });
  }

  confirmDelete(id: number) {
    this.leadToDeleteId = id;
    this.isDeleteModalOpen = true;
  }

  cancelDelete() {
    this.leadToDeleteId = null;
    this.isDeleteModalOpen = false;
  }

  deleteLeadConfirmed() {
    if (!this.leadToDeleteId) return;

    this.http.delete(`${this.apiUrl}/${this.leadToDeleteId}`).subscribe({
      next: () => {
        this.showToast('Lead eliminado exitosamente', 'success');
        this.loadLeads();
        this.cancelDelete();
      },
      error: () => {
        this.showToast('Error al eliminar el lead', 'danger');
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