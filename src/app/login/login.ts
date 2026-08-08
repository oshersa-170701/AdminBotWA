import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class LoginPage {
  email: string = '';
  password: string = '';
  showPassword: boolean = false;
  isLoading: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onLogin() {
    if (!this.email || !this.password) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Por favor ingresa tu correo y contraseña.',
        confirmButtonColor: '#2563eb'
      });
      return;
    }

    this.isLoading = true;

    // Petición al backend en NestJS
    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        
        // Guardamos el usuario devuelto por tu @Post('login')
        localStorage.setItem('user', JSON.stringify(res.user || res));

        // Alerta de éxito elegante
        Swal.fire({
          icon: 'success',
          title: '¡Bienvenido!',
          text: 'Has iniciado sesión correctamente.',
          timer: 1500,
          showConfirmButton: false
        }).then(() => {
          // Redirigimos limpiamente al dashboard
          this.router.navigateByUrl('/dashboard', { replaceUrl: true });
        });
      },
      error: (err) => {
        this.isLoading = false;
        console.error(err);
        
        Swal.fire({
          icon: 'error',
          title: 'Acceso denegado',
          text: 'Correo o contraseña incorrectos.',
          confirmButtonColor: '#2563eb'
        });
      },
    });
  }
}