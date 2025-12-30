import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";


export async function POST(request: NextRequest) {
    const { title } = await request.json();

    const book = await prisma.books.create({
        data: {
            title: title,
            owner: "568f5335-711e-4a36-92f2-dc5e0c1b1a93" // Temporary hardcoded user ID
        }
    })

    return new Response(JSON.stringify(book.id), { status: 200 } );
}