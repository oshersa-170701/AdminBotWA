import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile.html', // O tu plantilla correspondiente
  styleUrls: ['./profile.scss']
})
export class ProfileComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  user: any = { name: '', email: '', whatsapp_phone: '' };

  constructor(private router: Router) {}

  ngOnInit() {
    const userJson = localStorage.getItem('user');
    if (userJson) {
      try {
        this.user = JSON.parse(userJson);
      } catch (e) {
        console.error('Error al parsear el usuario', e);
      }
    }
  }

  closeModal() {
    this.close.emit();
  }

  logout() {
    localStorage.removeItem('user');
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
  // Método para cerrar si el clic fue exactamente en el overlay
  onOverlayClick(event: MouseEvent) {
    // Si el elemento donde se hizo clic es el mismo que tiene la clase del overlay
    if ((event.target as HTMLElement).classList.contains('profile-modal-overlay')) {
      this.closeModal();
    }
  }
}