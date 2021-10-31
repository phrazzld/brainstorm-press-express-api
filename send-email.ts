import nodemailer from "nodemailer";

export const sendEmail = async (
  email: string,
  subject: string,
  text: string
): Promise<void> => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: 587,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: subject,
      text: text,
    });

    console.log(`Successfully emailed ${email}: ${subject}.`);
  } catch (error) {
    console.error(error, `Failed to email ${email}: ${subject}.`);
  }
};
