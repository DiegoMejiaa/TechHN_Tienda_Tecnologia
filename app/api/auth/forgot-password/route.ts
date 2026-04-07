import { NextRequest } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import nodemailer from 'nodemailer';
import { successResponse, errorResponse } from '@/lib/api-response';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function POST(request: NextRequest) {
  try {
    const { correo } = await request.json();
    if (!correo) return errorResponse('Correo requerido', 400);

    const pool = await getConnection();
    const userRes = await pool.request()
      .input('correo', sql.NVarChar, correo)
      .query('SELECT id, nombre FROM usuarios WHERE correo = @correo');

    // Si el correo no existe, decirlo claramente
    if (userRes.recordset.length === 0) {
      return errorResponse('Correo no registrado en el sistema', 404);
    }

    const usuario = userRes.recordset[0];

    // Generar código de 6 dígitos
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expira = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    // Guardar código en DB — expiración en UTC
    await pool.request()
      .input('id_usuario', sql.BigInt, usuario.id)
      .input('codigo', sql.NVarChar, codigo)
      .query(`
        IF EXISTS (SELECT 1 FROM reset_codigos WHERE id_usuario = @id_usuario)
          UPDATE reset_codigos SET codigo = @codigo, expira = DATEADD(MINUTE, 15, GETUTCDATE()), usado = 0 WHERE id_usuario = @id_usuario
        ELSE
          INSERT INTO reset_codigos (id_usuario, codigo, expira, usado) VALUES (@id_usuario, @codigo, DATEADD(MINUTE, 15, GETUTCDATE()), 0)
      `);

    // Enviar correo
    await transporter.sendMail({
      from: `"TechHN" <${process.env.GMAIL_USER}>`,
      to: correo,
      subject: 'Código de recuperación - TechHN',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #1d4ed8;">TechHN — Recuperar contraseña</h2>
          <p>Hola <strong>${usuario.nombre}</strong>,</p>
          <p>Tu código de verificación es:</p>
          <div style="font-size: 40px; font-weight: bold; letter-spacing: 12px; text-align: center;
            background: #eff6ff; border-radius: 12px; padding: 24px; color: #1d4ed8; margin: 24px 0;">
            ${codigo}
          </div>
          <p style="color: #6b7280; font-size: 14px;">Este código expira en <strong>15 minutos</strong>.</p>
          <p style="color: #6b7280; font-size: 14px;">Si no solicitaste esto, ignora este correo.</p>
        </div>
      `,
    });

    return successResponse({ message: 'Código enviado' });
  } catch (e) {
    console.error(e);
    return errorResponse('Error al enviar el código');
  }
}
