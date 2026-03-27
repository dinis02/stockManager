import { Component } from '@angular/core';
import { CategoryService } from '../../services/categories.service';
import { BrandService } from '../../services/brand.service';
import { SupplierService } from '../../services/supplier.service';

@Component({
	selector: 'app-categories-page',
	template: `
		<div class="form-card">
			<div class="categories-page">
				<h2>Catálogo</h2>
				<div class="tabs">
				<button [class.active]="tab==='categories'" (click)="tab='categories'">Categorias</button>
				<button [class.active]="tab==='brands'" (click)="tab='brands'">Marcas</button>
				<button [class.active]="tab==='suppliers'" (click)="tab='suppliers'">Fornecedores</button>
			</div>

			<div *ngIf="tab==='categories'" class="section">
				<div class="add-row">
					<input #catname placeholder="Nova categoria" />
					<button (click)="addCategory(catname.value); catname.value=''">Adicionar</button>
				</div>
				<ul>
					<li *ngFor="let c of categories | async">
						{{ c.name }} <button (click)="delCategory(c.id)">x</button>
					</li>
				</ul>
			</div>

			<div *ngIf="tab==='brands'" class="section">
				<div class="add-row">
					<input #brandname placeholder="Nova marca" />
					<button (click)="addBrand(brandname.value); brandname.value=''">Adicionar</button>
				</div>
				<ul>
					<li *ngFor="let b of brands | async">
						{{ b.name }} <button (click)="delBrand(b.id)">x</button>
					</li>
				</ul>
			</div>

			<div *ngIf="tab==='suppliers'" class="section">
				<div class="add-row">
					<input #suppliername placeholder="Novo fornecedor" />
					<button (click)="addSupplier(suppliername.value); suppliername.value=''">Adicionar</button>
				</div>
				<ul>
					<li *ngFor="let s of suppliers | async">
						{{ s.name }} <button (click)="delSupplier(s.id)">x</button>
					</li>
				</ul>
			</div>
			</div>
		</div>
	`,
	styles: [`
		.tabs { display:flex; gap:8px; margin-bottom:12px }
		.tabs button { padding:6px 10px }
		.tabs button.active { background:#3f51b5; color:white }
		.add-row { display:flex; gap:8px; margin-bottom:8px }
	`]
})
export class CategoriesPageComponent {
	tab: 'categories' | 'brands' | 'suppliers' = 'categories';

	categories: any;
	brands: any;
	suppliers: any;

	constructor(
		private catSvc: CategoryService,
		private brandSvc: BrandService,
		private supplierSvc: SupplierService
	) {
		this.categories = this.catSvc.categories$;
		this.brands = this.brandSvc.brands$;
		this.suppliers = this.supplierSvc.suppliers$;
	}

	addCategory(name: string) {
		if (!name) return;
		this.catSvc.addCategory(name).subscribe(() => this.catSvc.loadCategories());
	}

	delCategory(id?: number) {
		if (!id) return;
		this.catSvc.deleteCategory(id).subscribe(() => this.catSvc.loadCategories());
	}

	addBrand(name: string) {
		if (!name) return;
		this.brandSvc.addBrand(name).subscribe(() => this.brandSvc.loadBrands());
	}

	delBrand(id?: number) {
		if (!id) return;
		this.brandSvc.deleteBrand(id).subscribe(() => this.brandSvc.loadBrands());
	}

	addSupplier(name: string) {
		if (!name) return;
		this.supplierSvc.addSupplier(name).subscribe(() => this.supplierSvc.loadSuppliers());
	}

	delSupplier(id?: number) {
		if (!id) return;
		this.supplierSvc.deleteSupplier(id).subscribe(() => this.supplierSvc.loadSuppliers());
	}
}

