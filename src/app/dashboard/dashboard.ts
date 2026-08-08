import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { ProfileComponent } from '../profile/profile'; // Ajusta la ruta si tu perfil está en otra carpeta dentro de src/app

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    RouterLink,
    RouterOutlet,
    ProfileComponent
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class DashboardComponent implements OnInit {
  currentUser: any = { name: 'Usuario', email: 'correo@empresa.com' };
  isProfileOpen: boolean = false;

  constructor(private readonly router: Router) {}

  ngOnInit() {
    this.loadUserData();
  }

  loadUserData() {
    const userJson = localStorage.getItem('user');
    if (userJson) {
      try {
        this.currentUser = JSON.parse(userJson);
      } catch (e) {
        console.error('Error parsing user data', e);
      }
    }
  }

  toggleProfileModal() {
    this.isProfileOpen = !this.isProfileOpen;
  }

  logout() {
    localStorage.removeItem('user');
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
  isMainDashboard(): boolean {
    // Retorna true solo si estamos exactamente en la ruta '/dashboard' sin submódulos
    return this.router.url === '/dashboard' || this.router.url === '/dashboard/';
  }
}