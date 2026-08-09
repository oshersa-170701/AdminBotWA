import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';

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
  
  customKeyword = {
    keyword: '',
    match_type: 'contains',
    response_type: 'text',
    reply_text: '',
    is_active: true
  };

  qrCodeImage: string | null = null;
  botStatus: string = 'Desconectado';
  isLoadingQr: boolean = false;
  isDisconnecting: boolean = false;
  
  isLoadingSettings: boolean = false;
  isLoadingKeyword: boolean = false;

  toastMessage: string | null = null;
  toastType: string = 'success';

  isSettingsDirty: boolean = false;
  isCustomKeywordDirty: boolean = false;

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
      this.checkInitialConnectionStatus();
    } else {
      this.showToast('No se encontró un número de WhatsApp vinculado a este usuario', 'warning');
    }
  }

  loadSettings() {
    this.http.post<any>(`${this.settingsApi}/load`, { whatsappPhone: this.whatsappPhone }).subscribe({
      next: (data) => {
        if (data) this.botSetting = data;
      },
    });
  }

  loadKeywords() {
    this.http.post<any[]>(`${this.keywordsApi}/list`, { whatsappPhone: this.whatsappPhone }).subscribe({
      next: (data) => {
        this.keywords = data || [];
      },
    });
  }

  // 💡 Verificar si una automatización rápida ya está activa
  isRuleActive(keywordText: string): boolean {
    return this.keywords.some(k => k.keyword.toLowerCase() === keywordText.toLowerCase());
  }

  // 💡 Obtener el ID de la regla rápida si ya existe
  getRuleId(keywordText: string): number | null {
    const found = this.keywords.find(k => k.keyword.toLowerCase() === keywordText.toLowerCase());
    return found ? found.id : null;
  }

  // 💡 Alternar entre Activar / Desactivar con 1 clic y estado de carga
  toggleQuickRule(keyword: string, responseType: string, replyText: string) {
    if (this.activeActionKey) return; // Evitar múltiples clics simultáneos
    this.activeActionKey = keyword;

    const existingId = this.getRuleId(keyword);

    if (existingId) {
      // Si ya está activa, la desactivamos/eliminamos
      this.deleteKeywordSilent(existingId, keyword, false);
    } else {
      // Si no está activa, la creamos
      const payload = {
        keyword: keyword,
        match_type: 'contains',
        response_type: responseType,
        reply_text: replyText,
        is_active: true
      };

      this.http.post(`${this.keywordsApi}/${this.whatsappPhone}`, payload).subscribe({
        next: () => {
          this.activeActionKey = null;
          Swal.fire({
            title: '¡Automatización Activada!',
            text: `La regla para "${keyword}" ya se encuentra funcionando en el bot.`,
            icon: 'success',
            confirmButtonColor: '#2563eb',
            background: '#ffffff',
            color: '#1e3a8a'
          });
          this.loadKeywords();
        },
        error: () => {
          this.activeActionKey = null;
          this.showToast('Error al activar la regla', 'danger');
        }
      });
    }
  }

 deleteKeywordSilent(id: number, keywordName: string, showAlert: boolean = true) {
    this.http.delete(`${this.keywordsApi}/${id}`).subscribe({
      next: () => {
        this.activeActionKey = null;
        if (showAlert) {
          this.showToast('Regla eliminada correctamente', 'success');
        } else {
          Swal.fire({
            title: '¡Automatización Desactivada!',
            text: `La regla para "${keywordName}" ha sido retirada del bot.`,
            icon: 'info',
            confirmButtonColor: '#2563eb'
          });
        }
        this.loadKeywords();
      },
      error: () => {
        this.activeActionKey = null;
        this.showToast('Error al desactivar la regla', 'danger');
      }
    });
  }

  deleteKeyword(id: number) {
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta regla de palabra clave se eliminará permanentemente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
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

  saveSettings() {
    this.isLoadingSettings = true;
    this.http.patch(`${this.settingsApi}/${this.whatsappPhone}`, this.botSetting).subscribe({
      next: () => {
        this.isLoadingSettings = false;
        this.isSettingsDirty = false;
        Swal.fire({
          title: '¡Configuración Guardada!',
          text: 'Los ajustes generales se han actualizado correctamente.',
          icon: 'success',
          confirmButtonColor: '#2563eb'
        });
      },
      error: () => {
        this.http.post(`${this.settingsApi}/${this.whatsappPhone}`, this.botSetting).subscribe({
          next: () => {
            this.isLoadingSettings = false;
            this.isSettingsDirty = false;
            Swal.fire({
              title: '¡Configuración Creada!',
              text: 'Se han establecido los ajustes iniciales con éxito.',
              icon: 'success',
              confirmButtonColor: '#2563eb'
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

  saveCustomKeyword() {
    if (!this.customKeyword.keyword || !this.customKeyword.reply_text) {
      this.showToast('Por favor completa ambos campos', 'warning');
      return;
    }

    this.isLoadingKeyword = true;

    this.http.post(`${this.keywordsApi}/${this.whatsappPhone}`, this.customKeyword).subscribe({
      next: () => {
        this.isLoadingKeyword = false;
        this.isCustomKeywordDirty = false;
        Swal.fire({
          title: '¡Regla Creada!',
          text: 'Tu nueva respuesta personalizada ya está activa en el bot.',
          icon: 'success',
          confirmButtonColor: '#2563eb'
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

  generateWhatsAppQR() {
    this.isLoadingQr = true;
    this.botStatus = 'Iniciando conexión con WhatsApp...';
    this.qrCodeImage = null;

    const fetchQrWithRetry = (attempts = 0) => {
      if (!this.isLoadingQr) return;

      this.http.post<any>(`${this.whatsappApi}/qr`, { whatsappPhone: this.whatsappPhone }).subscribe({
        next: (res) => {
          if (res && res.qr) {
            this.isLoadingQr = false;
            this.qrCodeImage = res.qr;
            this.botStatus = 'Escanea el código QR con tu WhatsApp';
            Swal.fire({
              title: '¡Código QR Generado!',
              text: 'Ya puedes escanear el código con tu WhatsApp.',
              icon: 'success',
              confirmButtonColor: '#2563eb'
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

  disconnectWhatsApp() {
    this.isDisconnecting = true;
    this.botStatus = 'Cerrando sesión y limpiando sistema...';

    this.http.post(`${this.whatsappApi}/disconnect`, { whatsappPhone: this.whatsappPhone }).subscribe({
      next: () => {
        this.isDisconnecting = false;
        this.qrCodeImage = null;
        this.botStatus = 'Desconectado / Haz clic en Conectar';
        Swal.fire({
          title: '¡Sesión Cerrada!',
          text: 'La sesión de WhatsApp se ha desconectado de forma segura.',
          icon: 'success',
          confirmButtonColor: '#2563eb'
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
          confirmButtonColor: '#2563eb'
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

  checkInitialConnectionStatus() {
    if (!this.whatsappPhone) return;

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

  onSettingsChange() {
    this.isSettingsDirty = true;
  }

  onCustomKeywordChange() {
    this.isCustomKeywordDirty = true;
  }
  activeActionKey: string | null = null; // 👈 Para saber cuál tarjeta está cargando
}