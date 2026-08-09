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
  customKeyword = {
    keyword: '',
    match_type: 'contains',
    response_type: 'text',
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
      this.checkInitialConnectionStatus(); // 👈 Verificamos si ya hay sesión activa en disco
    } else {
      this.showToast('No se encontró un número de WhatsApp vinculado a este usuario', 'warning');
    }
  }

 loadSettings() {
    // Ya no va el teléfono en la URL. O viaja por el Body o por headers de autorización (Token)
    this.http.post<any>(`${this.settingsApi}/load`, { whatsappPhone: this.whatsappPhone }).subscribe({
      next: (data) => {
        if (data) this.botSetting = data;
      },
    });
  }

loadKeywords() {
    // Ocultamos el teléfono enviándolo en el cuerpo de la petición POST
    this.http.post<any[]>(`${this.keywordsApi}/list`, { whatsappPhone: this.whatsappPhone }).subscribe({
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
        this.isSettingsDirty = false; // 👈 Bloqueamos el botón otra vez hasta nueva interacción
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
            this.isSettingsDirty = false; // 👈 Bloqueamos el botón otra vez
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

      // Cambiamos a POST para proteger el número en el Body
      this.http.post<any>(`${this.whatsappApi}/qr`, { whatsappPhone: this.whatsappPhone }).subscribe({
        next: (res) => {
          if (res && res.qr) {
            this.isLoadingQr = false;
            this.qrCodeImage = res.qr;
            this.botStatus = 'Escanea el código QR con tu WhatsApp';
            
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
              this.showToast('El servidor tardó demasiado en responder.', 'danger');
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

    // Ocultamos el teléfono en el Body de la petición POST
    this.http.post(`${this.whatsappApi}/disconnect`, { whatsappPhone: this.whatsappPhone }).subscribe({
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
  // 💡 Verificar si ya está conectado al cargar la vista
  checkInitialConnectionStatus() {
    if (!this.whatsappPhone) return;

    // Protegemos la ruta usando POST para que el teléfono no aparezca en el Network URL
    this.http.post<any>(`${this.whatsappApi}/status`, { whatsappPhone: this.whatsappPhone }).subscribe({
      next: (res) => {
        if (res && res.connected) {
          this.botStatus = 'Conectado y listo';
          this.qrCodeImage = null;
        } else {
          this.botStatus = 'Desconectado / Haz clic en Conectar';
        }
      },
      error: () => {
        this.botStatus = 'Desconectado / Haz clic en Conectar';
      }
    });
  }
  // 💡 FUNCIÓN DE ACTIVACIÓN INSTANTÁNEA (1 CLIC)
  quickDeployRule(keyword: string, responseType: string, replyText: string) {
    const payload = {
      keyword: keyword,
      match_type: 'contains',
      response_type: responseType,
      reply_text: replyText,
      is_active: true
    };

    this.http.post(`${this.keywordsApi}/${this.whatsappPhone}`, payload).subscribe({
      next: () => {
        Swal.fire({
          title: '¡Automatización Activada!',
          text: `La regla para "${keyword}" ya se encuentra funcionando en el bot.`,
          icon: 'success',
          confirmButtonColor: '#2563eb',
          background: '#ffffff',
          color: '#1e3a8a',
          customClass: { popup: 'custom-swal-popup' }
        });
        this.loadKeywords();
      },
      error: () => {
        this.showToast('Esta regla ya se encuentra registrada o activa', 'warning');
      }
    });
  }
  // 💡 GUARDAR REGLA PERSONALIZADA FÁCIL
  saveCustomKeyword() {
    if (!this.customKeyword.keyword || !this.customKeyword.reply_text) {
      this.showToast('Por favor completa ambos campos', 'warning');
      return;
    }

    this.isLoadingKeyword = true;

    this.http.post(`${this.keywordsApi}/${this.whatsappPhone}`, this.customKeyword).subscribe({
      next: () => {
        this.isLoadingKeyword = false;
        this.isCustomKeywordDirty = false; // 👈 Bloqueamos el botón de nuevo
        
        // 💡 SweetAlert de éxito integrado
        Swal.fire({
          title: '¡Regla Creada!',
          text: 'Tu nueva respuesta personalizada ya está activa en el bot.',
          icon: 'success',
          confirmButtonColor: '#2563eb',
          background: '#ffffff',
          color: '#1e3a8a',
          customClass: { popup: 'custom-swal-popup' }
        });

        this.customKeyword.keyword = '';
        this.customKeyword.reply_text = '';
        this.loadKeywords();
      },
      error: () => {
        this.isLoadingKeyword = false;
        this.showToast('Error al guardar la regla personalizada', 'danger');
      }
    });
  }
  isSettingsDirty: boolean = false;
  isCustomKeywordDirty: boolean = false;
  // 💡 Detectar cambios en Ajustes Generales para habilitar el botón
  onSettingsChange() {
    this.isSettingsDirty = true;
  }

  // 💡 Detectar cambios en Reglas Personalizadas para habilitar el botón
  onCustomKeywordChange() {
    this.isCustomKeywordDirty = true;
  }
}