import { Component, Output, Input, EventEmitter } from '@angular/core';
import { FormGroup, FormControl, Validators} from '@angular/forms';

@Component({
  selector: 'app-create-person-modal',
  templateUrl: './create-person-modal.component.html',
  styleUrls: ['./create-person-modal.component.scss']
})
export class CreatePersonModalComponent {

  isVisible = false;

  @Input()
  set visible(visible: boolean) {
    this.isVisible = visible;
    this.reset();
  }

  @Output()
  onCancel = new EventEmitter();

  @Output()
  onConfirm = new EventEmitter();

  propertiesForm: FormGroup;

  addressForms             = [];
  submitted                = false;
  addResidentialAddress    = false;
  addCorrespondenceAddress = false;
  genders                  = ['MALE', 'FEMALE', 'UNKNOWN'];
  civilStatuses            = ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'];
  countries                = ['FR', 'BE', 'UK'];

  constructor() { }

  reset() {
    this.propertiesForm = new FormGroup({
      lastName             : new FormControl('', [Validators.required]),
      firstName            : new FormControl('', [Validators.required]),
      registrationNumber   : new FormControl(''),
      gender               : new FormControl('', [Validators.required]),
      civilStatus          : new FormControl('', [Validators.required]),
      dateOfBirth          : new FormControl(''),
      dateOfDeath          : new FormControl(''),
    });

    const raddress = new FormGroup({
      country              : new FormControl(''),
      firstLine            : new FormControl(''),
      secondLine           : new FormControl(''),
      thirdLine            : new FormControl('')
    });

    const caddress = new FormGroup({
      country              : new FormControl(''),
      firstLine            : new FormControl(''),
      secondLine           : new FormControl(''),
      thirdLine            : new FormControl('')
    });

    this.addressForms = [{
      title    : 'Residential Address',
      checkbox : 'Has residential address',
      form     : raddress,
      present  : true
    }, {
      title    : 'Correspondence Address',
      checkbox : 'Has correspondence address',
      form     : caddress,
      present  : true
    }];
  }

  presentAddressForm(value, form) {
    const controls = form.form.controls;
    if (value) {
      Object.keys(controls).forEach(key => controls[key].enable());
    } else {
      Object.keys(controls).forEach(key => controls[key].disable());
    }
  }

  closeModal(save) {

    if (!save) {
      this.onCancel.emit();
      this.isVisible = false;
      return;
    }

    this.submitted = true;

    if (!this.propertiesForm.valid && save) {
      for (const i in this.propertiesForm.controls) {
        this.propertiesForm.controls[ i ].markAsDirty();
        this.propertiesForm.controls[ i ].updateValueAndValidity();
      }
      return;
    }

    const person = this.propertiesForm.value;
    for (const f of this.addressForms) {
      let value;
      if (!f.present) {
        value = null;
      } else {
        const address = f.form.value;
        const exist   = Object.keys(address).some(key => address[key]);
        value = exist ? {
          country: address.country,
          lines  : [address.firstLine, address.secondLine, address.thirdLine]
        } : null;
      }
      f.title === 'Residential Address' ? person['residentialAddress'] = value : person['correspondenceAddress'] = value;
    }

    this.onConfirm.emit(person);
    this.isVisible = false;
  }

}
