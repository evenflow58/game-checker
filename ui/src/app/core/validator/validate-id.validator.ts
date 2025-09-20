import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms";

export function validateId(id: RegExp): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const forbidden = id.test(control.value);
        return forbidden ? null : { forbiddenId: { value: control.value } };
    }
}