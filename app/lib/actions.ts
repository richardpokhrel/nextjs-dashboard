'use server'
import z from 'zod';
import postgres from 'postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { id } from 'zod/v4/locales';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

const sql = postgres(process.env.POSTGRES_URL!, {ssl: 'require'});

export type State = {
    errors?: {
        customerId?: string[];
        amount?: string[];
        status? : string[];
    };
    message?: string | null; 
};

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string({
        invalid_type_error: "please select a customer",
    }),
    amount: z.coerce.number()
    .gt(0, {message: 'please enter an amount greater than $0'}),
    status: z.enum(['pending', 'paid'], {
        invalid_type_error: 'please select an invoice status ',
    }),
    date: z.string(),
});

const CreateInvoice = FormSchema.omit({id: true, date: true});
const UpdateInvoice = FormSchema.omit({id: true, date: true});


export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
  ) {
    try {
      await signIn('credentials', formData);
    } catch (error) {
      if (error instanceof AuthError) {
        switch (error.type) {
          case 'CredentialsSignin':
            return 'Invalid credentials.';
          default:
            return 'Something went wrong.';
        }
      }
      throw error;
    }
  }


export async function deleteInvoice(id: string) {
    throw new Error('Failed to Delte Invoice');
    await sql `DELETE FROM invoice where id= ${id}`;
    revalidatePath('/dashboard/invoices');

}


export async function updateInvoice( id: string, prevState: State, FormData: FormData) {
    const validatedFields = UpdateInvoice.safeParse({
        customerId: FormData.get('customerId'),
        amount: FormData.get('amount'),
        status: FormData.get('status'),
    });
    if(!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Update Invoice',
        }
    }
    const {customerId, amount, status} =validatedFields.data;
    const amountInCents = amount * 100;

    try {
        await sql `
        UPDATE invoices
        SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
        WHERE id = ${id}
        `;
    } catch (error) {
        console.error(error);
    } 
    
    revalidatePath('/dashboard/invoices')
    redirect('/dashboard/invoices')

   
}
   

export async function createInvoice(prevState: State,  formData: FormData){
    const validatedFields = CreateInvoice.safeParse({
        customerId: formData.get('customer_id'),
        amount: formData.get('amount'),
        status: formData.get('status'),
      });
      if(!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Create Invoice.',
        };
      }
    const { customerId, amount, status } = validatedFields.data;
    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];

    try {
        await sql`
            INSERT INTO invoices (customer_id, amount, status, date)
            VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
        `;
    } catch (error) {
       return {
        message: 'Database Error: Failed to Create Invoice.',
       };

    } 
      
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoice');



    const rawFormData = {
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),

    };
    console.log(rawFormData)
}