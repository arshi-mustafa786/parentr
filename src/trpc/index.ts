import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server'
import {
  privateProcedure,
  publicProcedure,
  router,
} from './trpc'
import { TRPCError } from '@trpc/server'
import { db } from '@/db'
import {z} from 'zod';
import { NOTFOUND } from 'dns';


export const appRouter = router({
  authCallback: publicProcedure.query(async () => {
    const { getUser } = getKindeServerSession()
    const user = await getUser()

    if(user == null){
      throw new TRPCError({ code: 'UNAUTHORIZED' })
    }

    const dbUser = await db.user.findFirst({
      where : {
        id :  user.id
      } 
    })
    console.log("user from db is",dbUser)
    if(!dbUser){
      console.log("adding user in DB " + user.id)
      await db.user.create({
        data : {
          id : user.id,
          email : user.email!
        }
      })
    }
    if (user!=null && (!user.id || !user.email))
      throw new TRPCError({ code: 'UNAUTHORIZED' })

    return { success: true }
  }),
  getUserFiles : privateProcedure.query(async ({ctx})=>{
    const {userId, user} =  ctx;
    const files = await db.file.findMany({
      where : {
        userId : userId
      }
    })
    return files
  }),
  getFile: privateProcedure.input(z.object({ key: z.string() })).mutation(async ({ ctx, input }) => {
      const { userId } = ctx

      const file = await db.file.findFirst({
        where: {
          key: input.key,
          userId,
        },
      })

      if (!file) throw new TRPCError({ code: 'NOT_FOUND' })

      return file
    }),
  deleteFile : privateProcedure.input(z.object({id : z.string()})).mutation(async ({ctx,input})=>{
    const {userId} = ctx;

    const dbFile = await db.file.findFirst({
      where : {
        id : input.id,
        userId : userId
      }
    })

    if(!dbFile){
      throw new TRPCError({code : 'NOT_FOUND'});
    }

    await db.file.delete({
      where : {
        id : input.id
      }
    })

    return dbFile;
  }),
  getFileUploadStatus: privateProcedure.input(z.object({ fileId: z.string() })).query(async ({ input, ctx }) => {
      const file = await db.file.findFirst({
        where: {
          id: input.fileId,
          userId: ctx.userId,
        },
      })

      if (!file) return { status: 'PENDING' as const }

      return { status: file.uploadStatus }
    }),

})


export type AppRouter = typeof appRouter