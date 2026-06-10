import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreatePaymentAccountDto } from './dto/create-payment-account.dto'

@Injectable()
export class PaymentAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(memberId: bigint) {
    const accounts = await this.prisma.paymentAccount.findMany({
      where: { memberId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    })
    return { accounts }
  }

  async create(memberId: bigint, dto: CreatePaymentAccountDto) {
    if (dto.isDefault) {
      await this.prisma.paymentAccount.updateMany({
        where: { memberId, deletedAt: null },
        data: { isDefault: false },
      })
    }
    const account = await this.prisma.paymentAccount.create({
      data: {
        memberId,
        type: dto.type,
        provider: dto.provider,
        accountRef: dto.accountRef,
        label: dto.label,
        isDefault: dto.isDefault ?? false,
      },
    })
    return { account }
  }

  async setDefault(memberId: bigint, accountId: number) {
    await this.prisma.paymentAccount.updateMany({
      where: { memberId, deletedAt: null },
      data: { isDefault: false },
    })
    const account = await this.prisma.paymentAccount.update({
      where: { accountId },
      data: { isDefault: true },
    })
    return { account }
  }

  async remove(memberId: bigint, accountId: number) {
    const account = await this.prisma.paymentAccount.findFirst({
      where: { accountId, deletedAt: null },
    })
    if (!account) throw new NotFoundException({ success: false, message: 'Tài khoản không tồn tại' })
    if (account.memberId !== memberId) throw new ForbiddenException({ success: false, message: 'Không có quyền xoá tài khoản này' })
    await this.prisma.paymentAccount.update({
      where: { accountId },
      data: { deletedAt: new Date() },
    })
    return { success: true }
  }
}
