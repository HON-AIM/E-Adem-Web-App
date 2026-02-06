// Theme Toggle Functionality
class ThemeManager {
  constructor() {
    this.themeToggle = document.querySelector('.theme-toggle');
    this.themeIcon = document.querySelector('.theme-icon');
    this.currentTheme = localStorage.getItem('theme') || this.getSystemPreference();
    
    // Initialize theme
    this.setTheme(this.currentTheme);
    
    // Set up event listener
    if (this.themeToggle) {
      this.themeToggle.addEventListener('click', () => {
        this.toggleTheme();
      });
    }
  }
  
  getSystemPreference() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  
  setTheme(theme) {
    // Update data attribute on html element
    document.documentElement.setAttribute('data-theme', theme);
    
    // Update icon
    if (this.themeIcon) {
      const icon = this.themeIcon.querySelector('i');
      if (icon) {
        if (theme === 'dark') {
          icon.classList.remove('fa-moon');
          icon.classList.add('fa-sun');
        } else {
          icon.classList.remove('fa-sun');
          icon.classList.add('fa-moon');
        }
      } else {
        // Fallback for pages without icon inside span
        this.themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
      }
    }
    
    // Save to localStorage
    localStorage.setItem('theme', theme);
    this.currentTheme = theme;
  }
  
  toggleTheme() {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }
}

// Testimonial Carousel
class TestimonialCarousel {
  constructor() {
    this.testimonials = document.querySelectorAll('.testimonial');
    this.currentIndex = 0;
    this.autoSlideInterval = null;
    
    if (this.testimonials.length > 0) {
      this.init();
    }
  }
  
  init() {
    // Hide all testimonials except the first
    this.testimonials.forEach((testimonial, index) => {
      testimonial.style.display = index === 0 ? 'block' : 'none';
    });
    
    // Set up navigation buttons
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    
    if (prevBtn) prevBtn.addEventListener('click', () => this.prev());
    if (nextBtn) nextBtn.addEventListener('click', () => this.next());
    
    // Start auto-sliding
    this.startAutoSlide();
  }
  
  showTestimonial(index) {
    this.testimonials.forEach((testimonial, i) => {
      testimonial.style.display = i === index ? 'block' : 'none';
    });
    this.currentIndex = index;
  }
  
  next() {
    let nextIndex = this.currentIndex + 1;
    if (nextIndex >= this.testimonials.length) {
      nextIndex = 0;
    }
    this.showTestimonial(nextIndex);
  }
  
  prev() {
    let prevIndex = this.currentIndex - 1;
    if (prevIndex < 0) {
      prevIndex = this.testimonials.length - 1;
    }
    this.showTestimonial(prevIndex);
  }
  
  startAutoSlide() {
    this.autoSlideInterval = setInterval(() => {
      this.next();
    }, 5000);
  }
  
  stopAutoSlide() {
    if (this.autoSlideInterval) {
      clearInterval(this.autoSlideInterval);
    }
  }
}

// Form Validation
class FormValidator {
  static validateForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      let isValid = true;
      
      // Get all required fields
      const requiredFields = form.querySelectorAll('[required]');
      
      requiredFields.forEach(field => {
        if (!field.value.trim()) {
          isValid = false;
          field.style.borderColor = '#e53e3e';
        } else {
          field.style.borderColor = '#ddd';
        }
      });
      
      // Email validation
      const emailField = form.querySelector('input[type="email"]');
      if (emailField && emailField.value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailField.value)) {
          isValid = false;
          emailField.style.borderColor = '#e53e3e';
        }
      }
      
      if (isValid) {
        // Specific logic for Contact Form
        if (formId === 'contact-form') {
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;

            try {
                const formData = {
                    name: form.querySelector('#name').value,
                    email: form.querySelector('#email').value,
                    phone: form.querySelector('#phone').value,
                    subject: form.querySelector('#subject').value,
                    message: form.querySelector('#message').value
                };

                const response = await fetch('/api/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (response.ok) {
                    alert('Message sent successfully!');
                    form.reset();
                } else {
                    alert('Error sending message: ' + result.message);
                }
            } catch (error) {
                console.error('Contact error:', error);
                alert('Failed to send message. Please try again.');
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        } 
        // Logic for other legacy forms (if any still exist)
        else {
             alert('Form submitted successfully!');
             form.reset();
        }
      } else {
        alert('Please fill in all required fields correctly.');
      }
    });
  }
}

// Initialize components when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Theme Manager
  new ThemeManager();
  
  // 2. Mobile Menu Toggle (Fixed logic)
  const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
  const navMenu = document.querySelector('nav ul');
  
  if (mobileMenuBtn && navMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      navMenu.classList.toggle('active');
      
      // Toggle Icon between Bars and Times (X)
      const icon = mobileMenuBtn.querySelector('i');
      if (icon) {
        if (navMenu.classList.contains('active')) {
          icon.classList.remove('fa-bars');
          icon.classList.add('fa-times');
        } else {
          icon.classList.remove('fa-times');
          icon.classList.add('fa-bars');
        }
      } else {
        // Fallback
        mobileMenuBtn.textContent = navMenu.classList.contains('active') ? '✕' : '☰';
      }
      
      mobileMenuBtn.setAttribute('aria-expanded', navMenu.classList.contains('active'));
    });
  }
  
  // 3. Initialize Testimonial Carousel
  new TestimonialCarousel();
  
  // 4. Initialize Form Validation
  FormValidator.validateForm('loan-application-form');
  FormValidator.validateForm('investment-form');
  FormValidator.validateForm('forex-registration-form');
  FormValidator.validateForm('contact-form');
});