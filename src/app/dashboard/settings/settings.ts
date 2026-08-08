import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2'; // 👈 Importamos SweetAlert2

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RouterLink, 
  ],
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss']
})
export class SettingsComponent implements OnInit {
  settingsApi = 'https://bot-wa-back-production.up.railway.app/bot-settings';
  keywordsApi = 'https://bot-wa-back-production.up.railway.app/bot-keywords';
  whatsappApi = 'https://bot-wa-back-production.up.railway.app/whatsapp';

  whatsappPhone: string = '';

  botSetting = {
    bot_name: 'Bot Asistente',
    welcome_message: '',
    fallback_message: '',
    is_bot_active: true,
    start_time: '08:00',
    end_time: '18:00',
    allowed_days: [1, 2, 3, 4, 5]
  };

  keywords: any[] = [];
  
  newKeyword = {
    keyword: '',
    match_type: 'contains',
    response_type: 'product_search',
    reply_text: '',
    is_active: true
  };

  editingKeywordId: number | null = null;

  qrCodeImage: string | null = null;
  botStatus: string = 'Desconectado';
  isLoadingQr: boolean = false;
  isDisconnecting: boolean = false;
  
  isLoadingSettings: boolean = false;
  isLoadingKeyword: boolean = false;

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

    if (this.whatsappPhone) {
      this.loadSettings();
      this.loadKeywords();
    } else {
      this.showToast('No se encontró un número de WhatsApp vinculado a este usuario', 'warning');
    }
  }

  loadSettings() {
    this.http.get<any>(`${this.settingsApi}/${this.whatsappPhone}`).subscribe({
      next: (data) => {
        if (data) this.botSetting = data;
      },
    });
  }

  loadKeywords() {
    this.http.get<any[]>(`${this.keywordsApi}/user/${this.whatsappPhone}`).subscribe({
      next: (data) => {
        this.keywords = data;
      },
    });
  }

  // 💡 GUARDAR AJUSTES CON SWEETALERT2
  saveSettings() {
    this.isLoadingSettings = true;
    this.http.patch(`${this.settingsApi}/${this.whatsappPhone}`, this.botSetting).subscribe({
      next: () => {
        this.isLoadingSettings = false;
        Swal.fire({
          title: '¡Configuración Guardada!',
          text: 'Los ajustes generales del bot se han actualizado correctamente.',
          icon: 'success',
          confirmButtonColor: '#2563eb',
          background: '#ffffff',
          color: '#1e3a8a',
          customClass: { popup: 'custom-swal-popup' }
        });
      },
      error: () => {
        this.http.post(`${this.settingsApi}/${this.whatsappPhone}`, this.botSetting).subscribe({
          next: () => {
            this.isLoadingSettings = false;
            Swal.fire({
              title: '¡Configuración Creada!',
              text: 'Se han establecido los ajustes iniciales del bot con éxito.',
              icon: 'success',
              confirmButtonColor: '#2563eb',
              background: '#ffffff',
              color: '#1e3a8a',
              customClass: { popup: 'custom-swal-popup' }
            });
          },
          error: () => {
            this.isLoadingSettings = false;
            this.showToast('Error al guardar la configuración', 'danger');
          }
        });
      }
    });
  }

  // 💡 GUARDAR O ACTUALIZAR PALABRA CLAVE CON SWEETALERT2
  saveKeyword() {
    if (!this.newKeyword.keyword) {
      this.showToast('Escribe una palabra clave', 'warning');
      return;
    }

    this.isLoadingKeyword = true;

    if (this.editingKeywordId) {
      this.http.patch(`${this.keywordsApi}/${this.editingKeywordId}`, this.newKeyword).subscribe({
        next: () => {
          this.isLoadingKeyword = false;
          Swal.fire({
            title: '¡Actualizado!',
            text: 'La palabra clave ha sido modificada con éxito.',
            icon: 'success',
            confirmButtonColor: '#2563eb',
            background: '#ffffff',
            color: '#1e3a8a',
            customClass: { popup: 'custom-swal-popup' }
          });
          this.resetKeywordForm();
          this.loadKeywords();
        },
        error: () => {
          this.isLoadingKeyword = false;
          this.showToast('Error al actualizar la palabra clave', 'danger');
        }
      });
    } else {
      this.http.post(`${this.keywordsApi}/${this.whatsappPhone}`, this.newKeyword).subscribe({
        next: () => {
          this.isLoadingKeyword = false;
          Swal.fire({
            title: '¡Palabra Clave Agregada!',
            text: 'La nueva regla automatizada ya está activa.',
            icon: 'success',
            confirmButtonColor: '#2563eb',
            background: '#ffffff',
            color: '#1e3a8a',
            customClass: { popup: 'custom-swal-popup' }
          });
          this.resetKeywordForm();
          this.loadKeywords();
        },
        error: () => {
          this.isLoadingKeyword = false;
          this.showToast('Error al agregar la palabra clave (puede que ya exista)', 'danger');
        }
      });
    }
  }

  editKeyword(k: any) {
    this.editingKeywordId = k.id;
    this.newKeyword = {
      keyword: k.keyword,
      match_type: k.match_type,
      response_type: k.response_type,
      reply_text: k.reply_text || '',
      is_active: k.is_active
    };
  }

  cancelEdit() {
    this.resetKeywordForm();
    this.showToast('Edición cancelada', 'danger');
  }

  resetKeywordForm() {
    this.editingKeywordId = null;
    this.newKeyword = {
      keyword: '',
      match_type: 'contains',
      response_type: 'product_search',
      reply_text: '',
      is_active: true
    };
  }

  // 💡 ELIMINAR REGLA CON CONFIRMACIÓN SWEETALERT2
  deleteKeyword(id: number) {
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta regla de palabra clave se eliminará permanentemente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      background: '#ffffff',
      color: '#1e3a8a',
      customClass: { popup: 'custom-swal-popup' }
    }).then((result) => {
      if (result.isConfirmed) {
        this.http.delete(`${this.keywordsApi}/${id}`).subscribe({
          next: () => {
            this.showToast('Palabra clave eliminada', 'success');
            this.loadKeywords();
          },
          error: () => this.showToast('Error al eliminar', 'danger')
        });
      }
    });
  }

  // 💡 GENERAR QR CON ALERTA DE ÉXITO SWEETALERT2
  generateWhatsAppQR() {
    this.isLoadingQr = true;
    this.botStatus = 'Iniciando conexión con WhatsApp...';
    this.qrCodeImage = null;

    const fetchQrWithRetry = (attempts = 0) => {
      if (!this.isLoadingQr) return;

      this.http.get<any>(`${this.whatsappApi}/qr/${this.whatsappPhone}`).subscribe({
        next: (res) => {
          if (res && res.qr) {
            this.isLoadingQr = false;
            this.qrCodeImage = res.qr;
            this.botStatus = 'Escanea el código QR con tu WhatsApp';
            
            // Alerta de éxito al obtener el QR
            Swal.fire({
              title: '¡Código QR Generado!',
              text: 'Ya puedes escanear el código con tu aplicación de WhatsApp.',
              icon: 'success',
              confirmButtonColor: '#2563eb',
              background: '#ffffff',
              color: '#1e3a8a',
              customClass: { popup: 'custom-swal-popup' }
            });
          } else {
            if (attempts < 15) {
              this.botStatus = `Generando código QR (Intento ${attempts + 1}/15)...`;
              setTimeout(() => fetchQrWithRetry(attempts + 1), 2500);
            } else {
              this.isLoadingQr = false;
              this.botStatus = 'Tiempo de espera agotado';
              this.showToast('El servidor tardó demasiado en responder. Desconecta e intenta de nuevo.', 'danger');
            }
          }
        },
        error: () => {
          if (attempts < 10) {
            setTimeout(() => fetchQrWithRetry(attempts + 1), 2500);
          } else {
            this.isLoadingQr = false;
            this.botStatus = 'Error al conectar con WhatsApp';
            this.showToast('Error de comunicación con el backend.', 'danger');
          }
        }
      });
    };

    fetchQrWithRetry();
  }

  // 💡 DESCONECTAR CON ALERTA DE ÉXITO SWEETALERT2
  disconnectWhatsApp() {
    this.isDisconnecting = true;
    this.botStatus = 'Cerrando sesión y limpiando sistema...';

    this.http.post(`${this.whatsappApi}/disconnect/${this.whatsappPhone}`, {}).subscribe({
      next: () => {
        this.isDisconnecting = false;
        this.qrCodeImage = null;
        this.botStatus = 'Desconectado / Haz clic en Conectar';
        
        Swal.fire({
          title: '¡Sesión Cerrada!',
          text: 'La sesión de WhatsApp se ha desconectado de forma segura.',
          icon: 'success',
          confirmButtonColor: '#2563eb',
          background: '#ffffff',
          color: '#1e3a8a',
          customClass: { popup: 'custom-swal-popup' }
        });
      },
      error: () => {
        this.isDisconnecting = false;
        this.qrCodeImage = null;
        this.botStatus = 'Desconectado / Haz clic en Conectar';
        
        Swal.fire({
          title: '¡Sesión Reiniciada!',
          text: 'Los recursos de la sesión se han restablecido con éxito.',
          icon: 'success',
          confirmButtonColor: '#2563eb',
          background: '#ffffff',
          color: '#1e3a8a',
          customClass: { popup: 'custom-swal-popup' }
        });
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

  toggleDay(dayValue: number) {
    if (!this.botSetting.allowed_days) {
      this.botSetting.allowed_days = [];
    }
    const index = this.botSetting.allowed_days.indexOf(dayValue);
    if (index > -1) {
      this.botSetting.allowed_days.splice(index, 1);
    } else {
      this.botSetting.allowed_days.push(dayValue);
    }
  }

  isDaySelected(dayValue: number): boolean {
    return this.botSetting.allowed_days && this.botSetting.allowed_days.includes(dayValue);
  }

  applySuggestion(keyword: string) {
    this.newKeyword.keyword = keyword;

    const lower = keyword.toLowerCase();
    if (lower.includes('catalogo') || lower.includes('precio')) {
      this.newKeyword.response_type = 'product_search';
      this.newKeyword.match_type = 'contains';
    } else if (lower.includes('cotizacion')) {
      this.newKeyword.response_type = 'quote';
      this.newKeyword.match_type = 'contains';
    } else if (lower.includes('asesor')) {
      this.newKeyword.response_type = 'text';
      this.newKeyword.match_type = 'contains';
      this.newKeyword.reply_text = 'Con mucho gusto te comunicaremos con un asesor humano en breve.';
    } else if (lower.includes('hola')) {
      this.newKeyword.response_type = 'text';
      this.newKeyword.match_type = 'contains';
      this.newKeyword.reply_text = '¡Hola! Bienvenido a nuestro servicio automático. ¿En qué podemos ayudarte hoy?';
    }
  }
}