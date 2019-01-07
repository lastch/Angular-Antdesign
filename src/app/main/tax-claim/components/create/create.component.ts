import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { FormGroup, Validators, FormBuilder, FormArray, FormControl } from '@angular/forms';
import { ApiService } from '../../api/api.service';
import { ApiService as TaxRegisterApi } from '../../../tax-register/api/api.service';
import { CustomDatePipe } from 'app/shared/pipes/custom-date.pipe';

@Component({
  selector: 'app-create',
  templateUrl: './create.component.html',
  styleUrls: ['./create.component.scss'],
  providers: [CustomDatePipe]
})
export class CreateComponent implements OnInit {

  isVisible = false;
  taxRegisters: any = [];
  selectedTaxRegister: any;
  step   = 0;
  fields = [];

  optionalFields = [];

  form       : FormGroup;
  dynamicForm: FormGroup;

  @Input()
  set visible(visible: boolean) {
    this.isVisible = visible;
    this.reset();
  }

  @Output()
  onCancel = new EventEmitter();

  @Output()
  onConfirm = new EventEmitter();

  constructor(
    private api: ApiService,
    private fb: FormBuilder,
    private taxRegisterApi: TaxRegisterApi,
    private format: CustomDatePipe) { }

  ngOnInit() {
    this.api.getActiveTaxRegisters()
      .subscribe(res => {
        this.taxRegisters = res;
      });
  }

  reset() {
    this.step = 0;
    this.form = this.fb.group({
      register    : this.fb.control('', [Validators.required]),
      taxPayerType: this.fb.control('NATURAL_PERSON'),
      taxPayerId  : this.fb.control(1),
      statement   : this.fb.control('ASSESSMENT')
    });
  }

  setOptionControl(structure: any, field: any, control: FormGroup | FormArray | FormControl) {
    if (field.optional) {
      const _name = `option_${field.name}`
      this.optionalFields.push(_name);
      structure[_name] = this.fb.control(true);
    } else {
      control.setValidators([Validators.required]);
    }
    return control;
  }

  setDynamicForm(fields, object) {
    const structure = {};
    fields.forEach(field => {

      switch (field.value.type) {

        case 'composite':
          const group = this.setDynamicForm(field.value.fields, {});
          structure[field.name] = this.setOptionControl(structure, field, group);
          break;

        case 'list':
          const array = this.fb.array([this.fb.control('', [Validators.required])]);
          structure[field.name] = this.setOptionControl(structure, field, array);
          break;

        default:
          const control = this.fb.control(object[field.name]);
          structure[field.name] = this.setOptionControl(structure, field, control);
          break;
      }
    });
    return this.fb.group(structure);
  }

  formArrayControls(form) {
    const array = form as FormArray;
    return array.controls;
  }

  addField(form: FormArray) {
    form.push(this.fb.control('', [Validators.required]));
  }

  removeField(form: FormArray, index: number) {
    form.removeAt(index);
  }

  validation(form: FormGroup | FormArray) {
    Object.keys(form.controls).forEach(key => {
      const control = form.controls[key];
      control.markAsDirty();
      control.updateValueAndValidity();
      if (control instanceof FormGroup) {
       this.validation(control);
      } else if (control instanceof FormArray) {
        this.formArrayControls(control).forEach(c => {
          c.markAsDirty();
          c.updateValueAndValidity();
        });
      }
    });
  }

  toggleDisable(field, enable) {
    const name = field.name;
    enable ? this.dynamicForm.get(name).enable() : this.dynamicForm.get(name).disable();
  }

  get register() {
    return this.form.get('register');
  }

  closeModal() {
    this.onCancel.emit();
    this.isVisible = false;
    return;
  }

  nextStep() {

    if (!this.form.valid) {
      this.validation(this.form);
      return;
    }

    if (this.step === 0) {
      this.step = 1;
      this.taxRegisterApi.getTaxRegisterDetails(this.form.value.register)
        .subscribe(res => {
          this.selectedTaxRegister = res;
        });
    } else if (this.step === 1) {
      this.step = 2;
      this.api.loadFormData(this.selectedTaxRegister.code).subscribe(res => {
        this.fields = res['fields'];
        this.dynamicForm = this.setDynamicForm(res['fields'], res['object']);
      });
    } else if (this.step === 2) {
      if (!this.dynamicForm.valid) {
        this.validation(this.dynamicForm);
        return;
      } else {
        const dates = this.fields.filter(f => f.value.type === 'date');
        const v = this.dynamicForm.value;
        dates.forEach(date => v[date.name] = this.format.transform(v[date.name]));
        this.optionalFields.forEach(f => delete v[f]);
        const taxClaim = this.form.value;
        taxClaim['content'] = v;
        this.onConfirm.emit(taxClaim);
      }
    }
  }

}
