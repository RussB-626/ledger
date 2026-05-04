import { Pipe, PipeTransform } from '@angular/core';
import { UserService } from '../../core/services/user.service';

@Pipe({
  name: 'formatCurrency',
  standalone: true
})
export class FormatCurrencyPipe implements PipeTransform {
  constructor(private userService: UserService) {}

  transform(amount: number): string {
    const user = this.userService.getActiveUser();
    if (!user) {
      return this.defaultFormat(amount);
    }

    const symbol = user.currency_symbol;
    const decimalPlaces = user.decimal_places;
    const thousandSep = user.thousand_separator;
    const decimalSep = user.decimal_separator;
    const currencyPos = user.currency_position;
    const negativeFormat = user.negative_format;

    const absAmount = Math.abs(amount);
    const isNegative = amount < 0;

    const formatted = this.formatNumber(absAmount, decimalPlaces, thousandSep, decimalSep);
    const withCurrency = currencyPos === 'before'
      ? `${symbol}${formatted}`
      : `${formatted}${symbol}`;

    if (!isNegative) {
      return withCurrency;
    }

    return this.applyNegativeFormat(withCurrency, negativeFormat);
  }

  private applyNegativeFormat(value: string, format: string): string {
    switch (format) {
      case 'parentheses':
        return `(${value})`;
      case 'brackets':
        return `[${value}]`;
      case 'braces':
        return `{${value}}`;
      case '-prefix':
      default:
        return `-${value}`;
    }
  }

  private formatNumber(num: number, decimalPlaces: number, thousandSep: string, decimalSep: string): string {
    const parts = num.toFixed(decimalPlaces).split('.');
    const intPart = parts[0];
    const decPart = parts[1];

    const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSep);
    return decPart !== undefined ? `${withThousands}${decimalSep}${decPart}` : withThousands;
  }

  private defaultFormat(amount: number): string {
    return `$${amount.toFixed(2)}`;
  }
}
